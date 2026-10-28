/**
 * استوديو 3D التفاعلي - 3D Studio App
 * تحكم كامل ثلاثي الأبعاد: إضافة، حذف، وتغيير الألوان والخامات والمحاور
 */

// --- 1. التهيئة الأساسية للمشهد والكاميرا والصيرورة ---
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0f172a');

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(6, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// أدوات تحكم الكاميرا المدارية (OrbitControls)
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.maxPolarAngle = Math.PI / 2 + 0.1; // عدم النزول كثيراً تحت الأرضية

// أداة تحويل الأبعاد المباشرة (TransformControls)
const transformControls = new THREE.TransformControls(camera, renderer.domElement);
scene.add(transformControls);

// إيقاف دوران الكاميرا عند سحب مقابض التحريك
transformControls.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
});

// --- 2. الإضاءة والأرضية والشبكة ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 15, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// شبكة الأرضية المرجعية
const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x334155);
gridHelper.position.y = 0;
scene.add(gridHelper);

// مسطح غير مرئي لاستقبال الظلال على الأرض
const shadowPlaneGeo = new THREE.PlaneGeometry(50, 50);
const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.25 });
const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.01;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// --- 3. مصفوفة الكائنات والحالة (State) ---
let objectsList = [];
let selectedObject = null;
let objectCounter = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isPointerMoved = false;
let pointerDownPos = { x: 0, y: 0 };

// قاموس مسميات الأشكال باللغة العربية
const shapeNames = {
    box: 'مكعب',
    sphere: 'كرة',
    cylinder: 'أسطوانة',
    cone: 'مخروط',
    torus: 'حلقة دونات',
    crystal: 'بلورة كريستال',
    capsule: 'كبسولة',
    plane: 'مسطح'
};

// لوحة ألوان عشوائية أولية جذابة عند الإضافة
const presetColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'
];

// --- 4. وظائف إنشاء وإضافة المجسمات ---
function createGeometry(type) {
    switch (type) {
        case 'box':
            return new THREE.BoxGeometry(1.5, 1.5, 1.5);
        case 'sphere':
            return new THREE.SphereGeometry(1, 32, 32);
        case 'cylinder':
            return new THREE.CylinderGeometry(0.8, 0.8, 1.8, 32);
        case 'cone':
            return new THREE.ConeGeometry(0.9, 1.8, 32);
        case 'torus':
            return new THREE.TorusGeometry(0.9, 0.35, 24, 48);
        case 'crystal':
            return new THREE.IcosahedronGeometry(1.1, 0);
        case 'capsule':
            // إنشاء كبسولة مخصصة
            return typeof THREE.CapsuleGeometry !== 'undefined'
                ? new THREE.CapsuleGeometry(0.6, 1.2, 16, 32)
                : new THREE.CylinderGeometry(0.7, 0.7, 1.6, 32);
        case 'plane':
            const pGeo = new THREE.PlaneGeometry(2, 2);
            pGeo.rotateX(-Math.PI / 2);
            return pGeo;
        default:
            return new THREE.BoxGeometry(1.5, 1.5, 1.5);
    }
}

function addObject(type) {
    objectCounter++;
    const geometry = createGeometry(type);
    const randomColor = presetColors[objectCounter % presetColors.length];

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(randomColor),
        metalness: 0.15,
        roughness: 0.35,
        wireframe: false,
        transparent: true,
        opacity: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // تموضع لطيف وذكي عند الإضافة
    const offsetRadius = Math.min(objectCounter * 0.4, 3.5);
    const angle = objectCounter * 1.2;
    mesh.position.set(
        Math.cos(angle) * offsetRadius,
        type === 'plane' ? 0.05 : 1.2,
        Math.sin(angle) * offsetRadius
    );

    mesh.userData = {
        id: 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `${shapeNames[type] || 'مجسم'} #${objectCounter}`,
        shapeType: type
    };

    scene.add(mesh);
    objectsList.push(mesh);

    selectObject(mesh);
    updateObjectsCount();
    updateObjectsListView();
    showToast(`تمت إضافة ${mesh.userData.name}`, 'success');

    // الانتقال التلقائي لتبويب التعديل
    switchTab('tab-edit');
}

// --- 5. وظيفة تحديد الكائن (Selection) وفك التحديد ---
function selectObject(mesh) {
    if (selectedObject === mesh) return;

    selectedObject = mesh;

    if (mesh) {
        transformControls.attach(mesh);
        updateUIWithSelectedProperties();

        // إظهار واجهة التحكم وإخفاء رسالة الفراغ
        document.getElementById('no-selection-message').classList.add('hidden');
        document.getElementById('selection-controls').classList.remove('hidden');
        document.getElementById('selected-type-badge').textContent = mesh.userData.name;
    } else {
        transformControls.detach();
        document.getElementById('no-selection-message').classList.remove('hidden');
        document.getElementById('selection-controls').classList.add('hidden');
    }

    updateObjectsListView();
}

function deselectObject() {
    selectObject(null);
}

// --- 6. مزامنة بيانات الكائن مع واجهة التحكم (UI Sync) ---
function updateUIWithSelectedProperties() {
    if (!selectedObject) return;

    const mat = selectedObject.material;

    // اللون
    const hex = '#' + mat.color.getHexString();
    document.getElementById('object-color').value = hex;
    document.getElementById('object-color-hex').value = hex.toUpperCase();

    // خامات المادة
    document.getElementById('prop-metalness').value = mat.metalness;
    document.getElementById('val-metalness').textContent = mat.metalness.toFixed(2);

    document.getElementById('prop-roughness').value = mat.roughness;
    document.getElementById('val-roughness').textContent = mat.roughness.toFixed(2);

    document.getElementById('prop-opacity').value = mat.opacity;
    document.getElementById('val-opacity').textContent = mat.opacity.toFixed(2);

    document.getElementById('prop-wireframe').checked = mat.wireframe;

    // الموضع والتحجيم والدوران
    syncTransformInputs();
}

function syncTransformInputs() {
    if (!selectedObject) return;

    // الموضع
    document.getElementById('pos-x').value = selectedObject.position.x.toFixed(2);
    document.getElementById('pos-y').value = selectedObject.position.y.toFixed(2);
    document.getElementById('pos-z').value = selectedObject.position.z.toFixed(2);

    // التحجيم
    document.getElementById('scale-x').value = selectedObject.scale.x.toFixed(2);
    document.getElementById('scale-y').value = selectedObject.scale.y.toFixed(2);
    document.getElementById('scale-z').value = selectedObject.scale.z.toFixed(2);

    // التدوير (تحويل من راديان إلى درجات لسهولة الفهم)
    document.getElementById('rot-x').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.x));
    document.getElementById('rot-y').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.y));
    document.getElementById('rot-z').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.z));
}

// الاستماع لتغييرات الجيزمو لتحديث الإحداثيات مباشرة أثناء السحب
transformControls.addEventListener('change', () => {
    if (selectedObject) {
        syncTransformInputs();
    }
});

// --- 7. وظائف الحذف والنسخ (Duplicate & Delete) ---
function deleteSelectedObject() {
    if (!selectedObject) return;

    const name = selectedObject.userData.name;
    const mesh = selectedObject;

    transformControls.detach();
    scene.remove(mesh);

    // التخلص من الذاكرة لتفادي التسريب
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
        } else {
            mesh.material.dispose();
        }
    }

    objectsList = objectsList.filter(o => o !== mesh);
    selectedObject = null;

    selectObject(null);
    updateObjectsCount();
    updateObjectsListView();
    showToast(`تم حذف ${name}`, 'danger');
}

function duplicateSelectedObject() {
    if (!selectedObject) return;

    objectCounter++;
    const orig = selectedObject;
    const cloneGeo = orig.geometry.clone();
    const cloneMat = orig.material.clone();
    const cloneMesh = new THREE.Mesh(cloneGeo, cloneMat);

    cloneMesh.castShadow = true;
    cloneMesh.receiveShadow = true;

    // وضع النسخة بجانب الأصل قليلاً
    cloneMesh.position.copy(orig.position).add(new THREE.Vector3(1, 0, 1));
    cloneMesh.rotation.copy(orig.rotation);
    cloneMesh.scale.copy(orig.scale);

    cloneMesh.userData = {
        id: 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `${orig.userData.name} (نسخة)`,
        shapeType: orig.userData.shapeType
    };

    scene.add(cloneMesh);
    objectsList.push(cloneMesh);

    selectObject(cloneMesh);
    updateObjectsCount();
    updateObjectsListView();
    showToast(`تم نسخ المجسم بنجاح`, 'info');
}

function clearAllObjects() {
    if (objectsList.length === 0) {
        showToast('المشهد فارغ بالفعل!', 'info');
        return;
    }

    if (confirm('هل أنت متأكد من رغبتك في حذف جميع المجسمات من المشهد؟')) {
        transformControls.detach();
        objectsList.forEach(mesh => {
            scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });

        objectsList = [];
        selectedObject = null;
        selectObject(null);
        updateObjectsCount();
        updateObjectsListView();
        showToast('تم تفريغ المشهد بالكامل', 'danger');
    }
}

// --- 8. إدارة قائمة العناصر (Outliner) ---
function updateObjectsCount() {
    document.getElementById('obj-count').textContent = objectsList.length;
}

function updateObjectsListView() {
    const listContainer = document.getElementById('objects-list');
    listContainer.innerHTML = '';

    if (objectsList.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="padding: 20px 0;">
                <p>لا توجد مجسمات</p>
                <span>أضف مجسماً من تبويب "إضافة"</span>
            </div>
        `;
        return;
    }

    objectsList.forEach((mesh) => {
        const item = document.createElement('div');
        const isSelected = selectedObject === mesh;
        item.className = `obj-item ${isSelected ? 'selected' : ''}`;

        const colorHex = '#' + mesh.material.color.getHexString();
        item.innerHTML = `
            <div class="obj-meta">
                <span class="obj-color-dot" style="background-color: ${colorHex}"></span>
                <span>${mesh.userData.name}</span>
            </div>
            <button class="obj-del-btn" title="حذف المجسم"><i class="fa-solid fa-trash"></i></button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.obj-del-btn')) {
                e.stopPropagation();
                selectObject(mesh);
                deleteSelectedObject();
            } else {
                selectObject(mesh);
                switchTab('tab-edit');
            }
        });

        listContainer.appendChild(item);
    });
}

// --- 9. مستمعات الأحداث لعناصر التحكم والتعديل ---

// أزرار اختيار الأشكال لإضافتها
document.querySelectorAll('.shape-card').forEach(btn => {
    btn.addEventListener('click', () => {
        const shape = btn.getAttribute('data-shape');
        addObject(shape);
    });
});

// مغير الألوان الفوري
const colorPicker = document.getElementById('object-color');
const colorHexInput = document.getElementById('object-color-hex');

function applyColorToSelected(colorHex) {
    if (!selectedObject) return;
    selectedObject.material.color.set(colorHex);
    colorPicker.value = colorHex;
    colorHexInput.value = colorHex.toUpperCase();
    updateObjectsListView();
}

colorPicker.addEventListener('input', (e) => applyColorToSelected(e.target.value));

colorHexInput.addEventListener('change', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        applyColorToSelected(val);
    }
});

// كرات الألوان السريعة (Palette Swatches)
document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        applyColorToSelected(swatch.getAttribute('data-color'));
    });
});

// خصائص الخامة (المعدنية، الخشونة، الشفافية، الهيكل الشبكي)
document.getElementById('prop-metalness').addEventListener('input', (e) => {
    if (!selectedObject) return;
    const val = parseFloat(e.target.value);
    selectedObject.material.metalness = val;
    document.getElementById('val-metalness').textContent = val.toFixed(2);
});

document.getElementById('prop-roughness').addEventListener('input', (e) => {
    if (!selectedObject) return;
    const val = parseFloat(e.target.value);
    selectedObject.material.roughness = val;
    document.getElementById('val-roughness').textContent = val.toFixed(2);
});

document.getElementById('prop-opacity').addEventListener('input', (e) => {
    if (!selectedObject) return;
    const val = parseFloat(e.target.value);
    selectedObject.material.opacity = val;
    document.getElementById('val-opacity').textContent = val.toFixed(2);
});

document.getElementById('prop-wireframe').addEventListener('change', (e) => {
    if (!selectedObject) return;
    selectedObject.material.wireframe = e.target.checked;
});

// أزرار أنماط التحويل (Gizmo modes: Translate, Rotate, Scale)
const gizmoButtons = document.querySelectorAll('.mode-btn');
gizmoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        setGizmoMode(mode);
    });
});

function setGizmoMode(mode) {
    transformControls.setMode(mode);
    gizmoButtons.forEach(b => {
        if (b.getAttribute('data-mode') === mode) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
}

// إدخال الإحداثيات اليدوية
['pos-x', 'pos-y', 'pos-z'].forEach((id, idx) => {
    document.getElementById(id).addEventListener('input', (e) => {
        if (!selectedObject) return;
        const val = parseFloat(e.target.value) || 0;
        const axis = ['x', 'y', 'z'][idx];
        selectedObject.position[axis] = val;
    });
});

['scale-x', 'scale-y', 'scale-z'].forEach((id, idx) => {
    document.getElementById(id).addEventListener('input', (e) => {
        if (!selectedObject) return;
        const val = Math.max(0.01, parseFloat(e.target.value) || 1);
        const axis = ['x', 'y', 'z'][idx];
        selectedObject.scale[axis] = val;
    });
});

['rot-x', 'rot-y', 'rot-z'].forEach((id, idx) => {
    document.getElementById(id).addEventListener('input', (e) => {
        if (!selectedObject) return;
        const deg = parseFloat(e.target.value) || 0;
        const axis = ['x', 'y', 'z'][idx];
        selectedObject.rotation[axis] = THREE.MathUtils.degToRad(deg);
    });
});

// أزرار الحذف والنسخ
document.getElementById('btn-delete-selected').addEventListener('click', deleteSelectedObject);
document.getElementById('btn-duplicate-selected').addEventListener('click', duplicateSelectedObject);
document.getElementById('btn-clear-scene').addEventListener('click', clearAllObjects);

// التحكم بالبيئة والإضاءة
const sceneBgPicker = document.getElementById('scene-bg-color');
const sceneBgHex = document.getElementById('scene-bg-hex');

function setSceneBackground(hex) {
    scene.background = new THREE.Color(hex);
    sceneBgPicker.value = hex;
    sceneBgHex.value = hex.toUpperCase();
}

sceneBgPicker.addEventListener('input', (e) => setSceneBackground(e.target.value));
sceneBgHex.addEventListener('change', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) setSceneBackground(val);
});

document.getElementById('ambient-light-intensity').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ambientLight.intensity = val;
    document.getElementById('val-ambient-light').textContent = val.toFixed(1);
});

document.getElementById('dir-light-intensity').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    dirLight.intensity = val;
    document.getElementById('val-dir-light').textContent = val.toFixed(1);
});

document.getElementById('toggle-shadows').addEventListener('change', (e) => {
    renderer.shadowMap.enabled = e.target.checked;
    dirLight.castShadow = e.target.checked;
    objectsList.forEach(m => {
        m.material.needsUpdate = true;
    });
});

// الشريط العلوي: التبديل والوظائف السريعة
const btnToggleGrid = document.getElementById('btn-toggle-grid');
btnToggleGrid.addEventListener('click', () => {
    gridHelper.visible = !gridHelper.visible;
    btnToggleGrid.classList.toggle('active', gridHelper.visible);
});

const btnAutoRotate = document.getElementById('btn-auto-rotate');
btnAutoRotate.addEventListener('click', () => {
    orbitControls.autoRotate = !orbitControls.autoRotate;
    orbitControls.autoRotateSpeed = 2.0;
    btnAutoRotate.classList.toggle('active', orbitControls.autoRotate);
});

document.getElementById('btn-reset-cam').addEventListener('click', () => {
    camera.position.set(6, 6, 8);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
    showToast('تمت إعادة ضبط موضع الكاميرا', 'info');
});

document.getElementById('btn-screenshot').addEventListener('click', () => {
    // إخفاء مؤقت للجيزمو قبل التقاط الصورة للحصول على لقطة نظيفة
    const wasAttached = transformControls.object;
    if (wasAttached) transformControls.detach();

    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `3D-Scene-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    if (wasAttached) transformControls.attach(wasAttached);
    showToast('تم حفظ لقطة المشهد كصورة بنجاح!', 'success');
});

// --- 10. التبديل بين تبويبات اللوحة الجانبية ---
function switchTab(targetTabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === targetTabId);
    });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
    });
});

// --- 11. النقر والتحديد في الفضاء ثلاثي الأبعاد (Raycasting) ---
window.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
    isPointerMoved = false;
});

window.addEventListener('pointermove', (e) => {
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (dist > 5) isPointerMoved = true;
});

window.addEventListener('pointerup', (e) => {
    // تجاهل النقر إذا كان المستخدم يسحب الكاميرا أو ينقر على القائمة
    if (isPointerMoved) return;
    if (e.target.closest('#sidebar') || e.target.closest('.top-nav') || e.target.closest('.bottom-hints')) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objectsList, false);

    if (intersects.length > 0) {
        selectObject(intersects[0].object);
        switchTab('tab-edit');
    } else {
        // إذا ضغط على الفراغ يتم فك التحديد
        if (selectedObject) {
            deselectObject();
        }
    }
});

// --- 12. اختصارات لوحة المفاتيح السريعة ---
window.addEventListener('keydown', (e) => {
    // تجاهل الاختصارات إذا كان المستخدم يكتب في حقل إدخال
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
        case 'w':
            setGizmoMode('translate');
            break;
        case 'e':
            setGizmoMode('rotate');
            break;
        case 'r':
            setGizmoMode('scale');
            break;
        case 'delete':
        case 'backspace':
            if (selectedObject) deleteSelectedObject();
            break;
        case 'escape':
            deselectObject();
            break;
        case 'd':
            if (e.ctrlKey) {
                e.preventDefault();
                duplicateSelectedObject();
            }
            break;
    }
});

// --- 13. صندوق الإشعارات السريعة (Toast Notification) ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}

// --- 14. التكيف التلقائي مع أبعاد الشاشة (Resize) ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- 15. حلقة التحديث والرندر المستمرة (Render Loop) ---
function animate() {
    requestAnimationFrame(animate);

    orbitControls.update();

    renderer.render(scene, camera);
}

// إضافة مجسمين افتراضيين كبداية للترحيب بالمستخدم
function initDefaultScene() {
    addObject('box');
    addObject('sphere');
    // تحديد المكعب في البداية
    if (objectsList.length > 0) {
        selectObject(objectsList[0]);
    }
    showToast('مرحباً بك في استوديو 3D التفاعلي!', 'info');
}

// بدء التشغيل
initDefaultScene();
animate();
