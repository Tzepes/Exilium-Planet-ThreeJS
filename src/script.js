import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { gsap } from 'gsap'
import * as lil from 'lil-gui'
import Stats from 'stats.js'
import vertexShader from './shaders/planet/vertex.glsl'
import fragmentShader from './shaders/planet/fragment.glsl'
import atmosphereVertexShader from './shaders/atmosphere/atmosphereVertex.glsl'
import atmosphereFragmentShader from './shaders/atmosphere/atmosphereFragment.glsl'

const gui = new lil.GUI()

const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

//TODO: Reorganize code:
/**
 * Scene/Renderer
 * Camera
 * Loading Overlay (ShaderMaterial for loading mesh overlay moved under atmosphere phong material to allow it to render)
 * Planet
 * Atmosphere
 * Environment
 *      Particles
 *      EnvMap
 * Debug
 *      GUI
 *      Testing
 * Lights
 * Raycast
 * Events
 * Scene Tick
 * Algorithms
 *      Long Lat functions
 */

//Scene
const scene = new THREE.Scene()

//Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.x = -50
camera.position.z = 2

function cameraDistToOrg() {
    return Math.sqrt(camera.position.x * camera.position.x + camera.position.y * camera.position.y + camera.position.z * camera.position.z)
}

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

    //Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement) 
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.maxDistance = 70;
controls.minDistance = 20.3;
controls.enabled = false; // controls disabled until loading complete
controls.enablePan = false;
controls.zoomToCursor = true;
//controls.zoomSpeed *= (cameraDistToOrg() - 20) / 50;

// Loading 
const loadingBGSIcon = document.querySelector('.loadingContainer')
    //Loaders
let loaded = false;

const loadingManager = new THREE.LoadingManager(
    //Loaded
    () =>{
        gsap.to(overlayMaterial.uniforms.uAlpha, {duration: 1.5, value: 0})
        loadingBGSIcon.style.display = 'none';
        baseLocationUI.style.display = 'inline';
        controls.enabled = true;
        
        loaded = true;
    },
    //Progress
    () => {
        loadingBGSIcon.style.display = 'inline';
    }
)
const gltfLoader = new GLTFLoader(loadingManager)

//Textures
const planetColorTexture = new THREE.TextureLoader(loadingManager).load("img/Marsv2.png");
planetColorTexture.colorSpace = THREE.SRGBColorSpace;
const planetNormalMap = new THREE.TextureLoader(loadingManager).load("img/Mars v2_normalMap.png")
const planetHeightMap = new THREE.TextureLoader(loadingManager).load("img/Mars v2_heightMap.png")
const cloudsTexture = new THREE.TextureLoader(loadingManager).load("img/2k_earth_clouds.jpg")
const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager)

//Environment Map
const environmentMapTexture = cubeTextureLoader.load([
    'img/envMap/px.png',
    'img/envMap/nx.png',
    'img/envMap/py.png',
    'img/envMap/ny.png',
    'img/envMap/pz.png',
    'img/envMap/nz.png'
])


// Stars particles
const particlesGeometry = new THREE.BufferGeometry()
const count = 20000;

const positions = new Float32Array(count * 3)

for(let i = 0; i < count * 3; i++){
    let x = (Math.random() - 0.5) * 2000 
    let y = (Math.random() - 0.5) * 2000 
    let z = -Math.random() * 3000 

    positions[i] = x * 2;
    positions[i+1] = y * 2;
    positions[i+2] = z * 2;
}

particlesGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
)

const particlesMaterial = new THREE.PointsMaterial({
    size: Math.random()
})

const stars = new THREE.Points(particlesGeometry, particlesMaterial)
scene.add(stars)

//Material
const radius = 20;

const planetMat = new THREE.MeshStandardMaterial({
    displacementScale: 0.5
});

planetMat.map = planetColorTexture;
planetMat.normalMap = planetNormalMap;
planetMat.displacementMap = planetHeightMap;

// Planet object
const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 1000, 1000), 
    planetMat
);
scene.add(planet);

const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius + 15, 100, 100), 
    new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    })
);
scene.add(atmosphere)

//Clouds texture
const cloudMesh = new THREE.Mesh( //TODO: hide clouds after a certain zoom
    new THREE.SphereGeometry(radius+0.4, 32, 32), 
    new THREE.MeshPhongMaterial({
        map: cloudsTexture,
        side: THREE.DoubleSide,
        color: '#ffbc85',
        emissive: (89, 80, 14),
        opacity: 0.5,
        transparent: true,
        depthWrite: false
}));
scene.add(cloudMesh);

const cubeEnvMat = new THREE.MeshStandardMaterial();
cubeEnvMat.metalness = 0.95
cubeEnvMat.roughness = 0
cubeEnvMat.envMap = environmentMapTexture;
cubeEnvMat.side = THREE.DoubleSide;

    //Debug Material
// gui.add(planetMat, 'displacementScale').min(0).max(20).step(0.00001)
gui.add(planetMat, 'wireframe')

// Loading Overlay (moved under cloud phong material to allow it to render)
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        uAlpha: {value: 1}
    },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;    

        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Sferical coordonates
 * northen and eastern hemispheres must be taken into account
 */
let latitude = 44.4379186;
let longitude = 26.0120663;

function sphereCoords(lat, lng, r) {
    let theta = lat * Math.PI/180;
    let phi = lng * Math.PI/180;

    let x = (r * Math.sin(theta) * Math.cos(phi));
    let y = (r * Math.sin(theta) * Math.sin(phi));
    let z = (r * Math.cos(theta));
    // console.log('xyz on given lat lng: ', x, y, z)

    // console.log('theta ', theta)
    // console.log(Math.acos(z/Math.sqrt(x*x + y*y + z*z)))
    // console.log('phi ', phi)
    // console.log(CalculatePhi(x, y))

    // console.log('lat ', 180/Math.PI * theta) // latitude
    // console.log('lng ', 180/Math.PI * phi) //longitude
    return new THREE.Vector3(x, y, z);
}

// Use UV coords to have updating lat and lng based on planet rotation
function getLatLng(x, y, z){
    let theta = Math.acos(z/Math.sqrt(x*x + y*y + z*z));
    let phi = CalculatePhi(x, y);
    
    let lat = 180/Math.PI * theta;
    let lng = 180/Math.PI * phi;
    //console.log('lat/lng based on click: ', lat, lng)
    return new THREE.Vector2(lat, lng)
}

function CalculatePhi(x, y){
    let phi = 0;
    if(x>0){
        phi = Math.atan(y/x);
    } else if(x < 0 && y >= 0){
        phi = Math.atan(y/x) + Math.PI;
    } else if(x < 0 && y < 0){
        phi = Math.atan(y/x) - Math.PI;
    } else if(x == 0 && y > 0){
        phi = Math.PI/2
    } else if(x == 0 && y < 0){
        phi = -Math.PI/2
    }
    return phi;
}

//DOM
const baseLocationUI = document.querySelector("#ownBase");
const longlatTextUI = document.querySelector("#longlatText");
longlatTextUI.textContent = `Latitude:${latitude} Longitude:${longitude}`;
const clickedLngLatTextUI = document.querySelector("#clickedLngLat");
clickedLngLatTextUI.textContent = `Latitude:${latitude} Longitude:${longitude}`;

// Coordonates UI
const baseCoordsUI = document.getElementById('ownBase')
const baseUIPosition = new THREE.Vector3();
const clickedLocUI = document.getElementById('clickedLocation')
const clickedUIPosition = new THREE.Vector3();

let uiPositionOffset = new THREE.Vector3(); 
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const playerBaseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 20),
    new THREE.MeshBasicMaterial({color: 'cyan'})
)
scene.add(playerBaseMesh);
let playerBaseLocation = sphereCoords(latitude, longitude, radius);
playerBaseMesh.position.set(playerBaseLocation.x, playerBaseLocation.y, playerBaseLocation.z);

const clickedLocationMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, 2, 2),
    new THREE.MeshBasicMaterial({color: 'red'})
)
scene.add(clickedLocationMesh)

function handleUIPosition(object, uiToPose, uiPosition) {
    if(object){
        uiPositionOffset.copy(object.position);
        uiPositionOffset.sub(camera.position);
        uiPositionOffset.normalize();
        uiPositionOffset.applyAxisAngle(Y_AXIS, -Math.PI / 2);
        uiPositionOffset.multiplyScalar(0.5);
        uiPositionOffset.y = 2.5;

        uiPosition.setFromMatrixPosition(object.matrixWorld);
        uiPosition.add(uiPositionOffset);
        uiPosition.project(camera);
        var widthHalf = window.innerWidth / 2,
            heightHalf = window.innerHeight/2;
        uiPosition.x = (uiPosition.x * widthHalf) + widthHalf;
        uiPosition.y = -(uiPosition.y * heightHalf) + heightHalf;
        uiToPose.style.top = `${uiPosition.y}px`;
        uiToPose.style.left = `${uiPosition.x}px`;
    }
}
// console.log(location.x, location.y, location.z)


//Env Map
//scene.background = environmentMapTexture


//Lights

const ambientLight = new THREE.AmbientLight(0xffffff, 0.01)
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 0.6)
pointLight.position.set(-200, 50, 50);
scene.add(pointLight)

const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5);
scene.add(pointLightHelper)

const boxHelper = new THREE.BoxHelper( pointLight, 0xffff00 );
scene.add( boxHelper );

// Raycast
const raycaster = new THREE.Raycaster()

function onMouseClick(event) {
    const mouse = {
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
    }
    
    raycaster.setFromCamera(mouse, camera);

    if(loaded){
        const intersects = raycaster.intersectObject(planet, false);
        if(intersects[0]){
            //console.clear()
            const vectLatLng = getLatLng(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
            const vect3D = sphereCoords(vectLatLng.x, vectLatLng.y, radius);
            clickedLocationMesh.position.set(vect3D.x, vect3D.y, vect3D.z);
            clickedLocUI.style.display = 'inline';
            //let clickedLocation = new THREE.Vector3(vect3D.x, vect3D.y, vect3D.z)
            clickedLngLatTextUI.textContent = `Latitude:${vectLatLng.x} Longitude:${vectLatLng.y}`;
        }
    }
}

//Check for click for parcel
    /**
     * Method 1
     * click on planet - > get long lat of clicked location
     * check from database if click inside parcel(aka within the rectangle with points A, B, C, D)
     */

//Events
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

renderer.domElement.addEventListener('mouseup', onMouseClick, false);

window.addEventListener("wheel", (event) => {
    switch(event.deltaY){
        case -100:
            controls.zoomSpeed = (cameraDistToOrg() - 20) / 50 * 2.5;
            break;
        case 100:
            controls.zoomSpeed = (cameraDistToOrg() - 20) / 50 * 4;
            break;
    }
});

// Scene tick update

const clock = new THREE.Clock()

function animate() {
    stats.begin()

    requestAnimationFrame(animate)

    const elapsedTime = clock.getElapsedTime()

    // Animate selected location UI
    handleUIPosition(clickedLocationMesh, clickedLocUI, clickedUIPosition)
    handleUIPosition(playerBaseMesh, baseCoordsUI, baseUIPosition)
    
    controls.update()

    planet.rotation.y = 0.02 * elapsedTime;
    cloudMesh.rotation.y = 0.03 * elapsedTime;

    render()
    
    stats.end()
}

function render() {
    renderer.render(scene, camera)
}
animate()
