import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const characters = [
    {
        id: 1,
        name: "砂金",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_2024-10-20-12-07-01-776_tv.danmaku.bil-IamNbvdEXRfj0bayqnzZgFsCpdUnbI.jpg",
        rarity: 5,
        pmxModel: "models/砂金/sajin.pmx",
        vmdAnimation: "anime/walk.vmd"
    },
    {
        id: 2,
        name: "姬子",
        image: "/placeholder.svg?height=500&width=300",
        rarity: 4,
        pmxModel: "models/姬子/himeko.pmx",
        vmdAnimation: "anime/walk.vmd"
    },
    {
        id: 3,
        name: "卡芙卡",
        image: "/placeholder.svg?height=500&width=300",
        rarity: 4,
        pmxModel: "models/卡芙卡/kafka.pmx",
        vmdAnimation: "anime/walk.vmd"
    },
];

let currentCharacterIndex = 0;
let isPlaying = false;
let isAnimating = false;
const characterShowcase = document.getElementById('character-showcase');
const characterName = document.getElementById('characterName');
const characterRarity = document.getElementById('characterRarity');
const bgMusic = document.getElementById('bgMusic');
const toggleMusicBtn = document.getElementById('toggleMusic');
const toggleAnimationBtn = document.getElementById('toggleAnimation');
const switchCharacterBtn = document.getElementById('switchCharacter');
const musicStatus = document.getElementById('musicStatus');
const animationStatus = document.getElementById('animationStatus');

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 300 / 500, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('model-viewer'), alpha: true, antialias: true });
renderer.setSize(300, 500);
renderer.setClearColor(0x000000, 0);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Adjusted OutlineEffect for Genshin Impact-like outlines
const effect = new OutlineEffect(renderer, {
    defaultThickness: 0.003,
    defaultColor: new THREE.Color(0x222222),
    defaultAlpha: 0.8,
    defaultKeepAlive: true
});

// Add OrbitControls for better model interaction
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = false;
controls.enablePan = false;
controls.minPolarAngle = Math.PI / 2;
controls.maxPolarAngle = Math.PI / 2;

// Adjusted lighting setup for Genshin Impact-like appearance
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x8088ff, 0.3);
fillLight.position.set(-5, 5, -5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
rimLight.position.set(0, 5, -10);
scene.add(rimLight);

// Set initial camera position
camera.position.set(0, 30, 20);
controls.target.set(0, 15, 0);
controls.update();

const loader = new MMDLoader();
const helper = new MMDAnimationHelper({
    afterglow: 2.0,
    physics: {
        enabled: true,
        gravity: new THREE.Vector3(0, -9.8 * 10, 0), // Increased gravity
        unitStep: 1 / 65, // Smaller time step for more accurate simulation
        maxStepNum: 3, // Increased max step number for smoother simulation
    }
});

let currentMesh;
let currentAnimation;

function loadModel(modelPath, animationPath) {
    console.log('Loading model:', modelPath);
    console.log('Loading animation:', animationPath);

    if (currentMesh) {
        scene.remove(currentMesh);
        helper.remove(currentMesh);
    }

    loader.loadWithAnimation(
        modelPath,
        animationPath,
        function (mmd) {
            const mesh = mmd.mesh;
            const animation = mmd.animation;

            console.log('Model and animation loaded successfully');
            currentMesh = mesh;
            currentAnimation = animation;
            scene.add(mesh);

            // Enhance material for Genshin Impact-like appearance
            mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.material.map) {
                        child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    }
                    child.material.shininess = 70;
                    child.material.specular = new THREE.Color(0x666666);
                    child.material.emissive = new THREE.Color(0x222222);
                    
                    child.material.onBeforeCompile = (shader) => {
                        shader.fragmentShader = shader.fragmentShader.replace(
                            '#include <lights_phong_fragment>',
                            `
                            #include <lights_phong_fragment>
                            float toonIntensity = smoothstep(0.8, 0.9, totalDiffuse);
                            totalDiffuse = mix(totalDiffuse * 2.0, totalDiffuse, toonIntensity);
                            `
                        );
                    };
                    child.material.needsUpdate = true;
                }
            });

            // Add the model and animation to the helper
            helper.add(mesh, {
                animation: animation,
                physics: true
            });

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 10 / maxDim; // Adjusted scale factor

            mesh.position.sub(center.multiplyScalar(scale));
            mesh.scale.multiplyScalar(scale);

            // Adjust position to show upper body
            mesh.position.y = -5;

            // Reset camera and controls
            camera.position.set(0, 10, 20);
            controls.target.set(0, 10, 0);
            controls.update();

            if (isAnimating) {
                helper.enable('animation', true);
            } else {
                helper.enable('animation', false);
            }

            console.log('Model and animation setup complete');
        },
        onProgress,
        onError
    );
}

function onProgress(xhr) {
    if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        console.log(Math.round(percentComplete, 2) + '% downloaded');
    }
}

function onError(error) {
    console.error('An error occurred while loading:', error);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    helper.update(clock.getDelta());
    
    effect.render(scene, camera);
}

const clock = new THREE.Clock();

function updateCharacterDisplay() {
    const character = characters[currentCharacterIndex];
    characterName.textContent = character.name;
    characterRarity.innerHTML = '';
    for (let i = 0; i < character.rarity; i++) {
        characterRarity.innerHTML += `
            <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
        `;
    }
    loadModel(character.pmxModel, character.vmdAnimation);
}

toggleMusicBtn.addEventListener('click', () => {
    if (bgMusic.paused) {
        bgMusic.play();
        isPlaying = true;
        musicStatus.classList.remove('bg-red-500');
        musicStatus.classList.add('bg-green-500');
    } else {
        bgMusic.pause();
        isPlaying = false;
        musicStatus.classList.remove('bg-green-500');
        musicStatus.classList.add('bg-red-500');
    }
});

toggleAnimationBtn.addEventListener('click', () => {
    isAnimating = !isAnimating;
    if (isAnimating) {
        helper.enable('animation', true);
        animationStatus.classList.remove('bg-red-500');
        animationStatus.classList.add('bg-green-500');
    } else {
        helper.enable('animation', false);
        animationStatus.classList.remove('bg-green-500');
        animationStatus.classList.add('bg-red-500');
    }
});

switchCharacterBtn.addEventListener('click', () => {
    currentCharacterIndex = (currentCharacterIndex + 1) % characters.length;
    updateCharacterDisplay();
});

// Initial setup
console.log('Starting initial setup');
updateCharacterDisplay();
animate();
console.log('Initial setup complete');