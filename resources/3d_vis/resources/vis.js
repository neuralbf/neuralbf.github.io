import * as THREE from "three";
import { OrbitControls } from "./OrbitControls.js";
import { OBJLoader } from "./OBJLoader.js";
import { PLYLoader } from "./ply.js";
import GUI from "./lilgui.js";


const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const width = window.innerWidth;
const height = window.innerHeight - 200;
const ratio = width / height;
const camera = new THREE.PerspectiveCamera(75, ratio, 0.1, 1000);
camera.up = new THREE.Vector3(0, 0, 1);
camera.position.y = -5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.getElementById("canvas").appendChild(renderer.domElement);


// Set up Controls
const controls = new OrbitControls(camera, renderer.domElement, scene);


// Set up Lights
const light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const pointMats = [];


function loadScene(root, instCount, visible) {
    const sceneGroup = new THREE.Group();
    sceneGroup.visible = visible;

    // Load Convexes
    const cvxGroup = new THREE.Group();
    sceneGroup.add(cvxGroup);

    const cvxs = [];
    const cvxLoader = new OBJLoader();
    function onLoadConvex(obj, i) {
        const subgroup = new THREE.Group();
        const geometry = obj.children[0].geometry;
        const material = new THREE.MeshBasicMaterial({ color: 0x404040 });
        material.transparent = true;
        material.opacity = 0.2;
        const cvx = new THREE.Mesh(geometry, material);
        subgroup.add(cvx);

        const material2 = new THREE.MeshBasicMaterial({ color: 0x404040 });
        material2.wireframe = true;
        const cvx2 = new THREE.Mesh(geometry, material2);
        subgroup.add(cvx2);

        cvxGroup.add(subgroup);
        cvxs[i] = subgroup;
        if (i != 0) {
            subgroup.visible = false;
        } else {
            renderer.render(scene, camera);
        }
    }
    for (var i = 0; i < instCount; i++) {
        cvxs.push(null);
        const id = i;
        cvxLoader.load(root + "/cvx_hulls/" + i + ".obj", function (o) {
            onLoadConvex(o, id);
        });
    }


    // Load points
    const plyLoader = new PLYLoader();

    const seedGroup = new THREE.Group();
    sceneGroup.add(seedGroup);
    plyLoader.load(root + "/scene.seeds.ply", function (geometry) {
        const material = new THREE.PointsMaterial({ color: 0xff0000 });
        material.size = 0.1;
        const points = new THREE.Points(geometry, material);
        seedGroup.add(points);
        renderer.render(scene, camera);
    });

    const instGroup = new THREE.Group();
    sceneGroup.add(instGroup);
    plyLoader.load(root + "/scene.pts.instance_pred.ply", function (geometry) {
        const material = new THREE.PointsMaterial({ vertexColors: true });
        material.size = 0.01;
        pointMats.push(material);
        const points = new THREE.Points(geometry, material);
        instGroup.add(points);
        renderer.render(scene, camera);
    });

    const inpGroup = new THREE.Group();
    inpGroup.visible = false;
    sceneGroup.add(inpGroup);
    plyLoader.load(root + "/scene.pts.input.ply", function (geometry) {
        const material = new THREE.PointsMaterial({ color: 0x303030 });
        material.size = 0.01;
        pointMats.push(material);
        const points = new THREE.Points(geometry, material);
        inpGroup.add(points);
        renderer.render(scene, camera);
    });

    scene.add(sceneGroup);

    return {
        sceneGroup: sceneGroup,
        inpGroup: inpGroup,
        seedGroup: seedGroup,
        instGroup: instGroup,
        cvxGroup: cvxGroup,
        cvxs: cvxs,
    }
}

const scenesData = [
    loadScene("resources/scene0", 23, true),
    loadScene("resources/scene1", 31, false),
    loadScene("resources/scene2", 14, false),
    loadScene("resources/scene3", 16, false),
    loadScene("resources/scene4", 33, false),
    loadScene("resources/scene5", 15, false),
    loadScene("resources/scene6", 15, false),
];

function removeLoadMsg() {
    document.getElementById("load-warning").style.visibility = "hidden";
    renderer.render(scene, camera);
}
setTimeout(removeLoadMsg, 15000.0); // This is definitely how loading works, trust me.


// Set up GUI
const gui = new GUI();
gui.onChange(function () {
    scenesData.forEach(function (sd) {
        if (guiState.showSeeds) {
            sd.seedGroup.visible = true;
        } else {
            sd.seedGroup.visible = false;
        }
        if (guiState.showInst) {
            sd.instGroup.visible = true;
            sd.inpGroup.visible = false;
        } else {
            sd.instGroup.visible = false;
            sd.inpGroup.visible = true;
        }
        for (var i = 0; i < sd.cvxs.length; i++) {
            sd.cvxs[i].visible = (i == guiState.currentInst) || guiState.showCvx;
        }
    });

    for (var i = 0; i < scenesData.length; i++) {
        scenesData[i].sceneGroup.visible = (i == guiState.currentScene);
    }

    pointMats.forEach(function (mat) {
        mat.size = guiState.pointSize;
    });

    renderer.render(scene, camera);
});

const guiState = {
    showInst: true,
    showCvx: false,
    showSeeds: true,
    currentScene: 0,
    currentInst: 0,
    pointSize: 0.01,
};

gui.add(guiState, "showCvx").name("Show All Instances");
gui.add(guiState, "showInst").name("Show Instance Segmentation");
gui.add(guiState, "showSeeds").name("Show Queries");
gui.add(guiState, "pointSize", 0.005, 0.05).name("Point Scale");
gui.add(guiState, "currentInst", 0, 33, 1).name("Instance ID");
const sceneIDs = []; for (var i = 0; i < scenesData.length; i++) sceneIDs.push(i);
gui.add(guiState, "currentScene", sceneIDs).name("Scene");

controls.addEventListener("change", function () {
    renderer.render(scene, camera);
});
controls.update();