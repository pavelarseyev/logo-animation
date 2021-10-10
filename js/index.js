import * as THREE from 'three';
// import FontFaceObserver from 'fontfaceobserver';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import part1 from '../img/part1(top).png';
import part2 from '../img/part2(bottom).png';
import part3 from '../img/part3(line1).png';
import part4 from '../img/part4(line2).png';
import part5 from '../img/part5(line3).png';
import part6 from '../img/part6(text).png';

const urlsArray = [part1, part2, part3, part4, part5, part6];

const promisesArray = Promise.all(
    urlsArray.map(part => {
        return new Promise((res, rej) => {
            const image = new Image();
            image.onload = function() {
                res(image);
            }
            image.src = part;
        });
    })
)


export default class Sketch {
  constructor(options) {
    this.debug = options.debug;
    this.time = 0;
    this.container = options.dom;
    this.scene = new THREE.Scene();

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      100,
      2000
    );
    this.camera.position.z = 600;

    //set the camera fov to the actual screen size to get the three js pixels be the actual screen pixels
    this.camera.fov = 2 * Math.atan(this.height / 2 / 600) * (180 / Math.PI);
    this.camera.far = 3000;
    this.camera.near = 0.5;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // transparent background of the canv
    });
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.imageWidth = 0;
    this.imageHeight = 0;
    this.spacing = 5;
    this.parts = [];
    this.lastTime = 0;
    this.interval = 1000/60; // time in milliseconds to draw every frame
    this.timer = 0;

    promisesArray.then((imagesArray) => {
      this.resize();
      this.setupResize();
      this.createImageDataArrays(imagesArray);

      if (this.debug) {
        this.drawPreview();
        this.drawStaticCanvas();
      }

      this.addObjects();
      this.render(0);
    });
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    //recalculate the width and height
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    //change the size of the renderer
    this.renderer.setSize(this.width, this.height);

    //change the camera
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  createImageDataArrays(imagesArray) {
    let cnv = document.createElement("canvas");
    let ctx = cnv.getContext("2d");

    imagesArray.forEach((image, index) => {
      this.parts[index] = [];

      let w = (this.imageWidth = cnv.width = image.width);
      let h = (this.imageHeight = cnv.height = image.height);

      ctx.drawImage(image, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      const step = 4;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let offset = (w * y + x) * step;
          let alpha = data[offset + 3];

          if (alpha / 255 >= 0.4) {
            let red = data[offset];
            let green = data[offset + 1];
            let blue = data[offset + 2];
            let rgba = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;

            this.parts[index].push({
              targetX: x,
              targetY: y,
              x: this.spacing * x,
              y: this.spacing * y,
              color: rgba,
            });
          }
        }
      }
    });

    console.log("parts for logo: ", this.parts);
    console.log(
      "total parts number: ",
      this.parts.reduce((acc, item, i, array) => acc + item.length, 0)
    );
  }

  drawPreview() {
    let cnv = document.createElement("canvas");
    let ctx = cnv.getContext("2d");

    let w = (cnv.width = this.imageWidth);
    let h = (cnv.height = this.imageHeight);

    cnv.style.width = `${w / 2}px`;
    cnv.style.height = `${h / 2}px`;
    cnv.style.position = "fixed";
    cnv.style.top = "0";
    cnv.style.left = "0";
    cnv.style.border = "1px solid red";
    cnv.style.pointerEvents = "none";

    this.parts.forEach((part) => {
      part.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x / this.spacing, p.y / this.spacing, 1, 1);
        ctx.restore();
      });
    });

    document.body.appendChild(cnv);
  }

  drawStaticCanvas() {
    this.staticCnv = document.createElement("canvas");
    this.staticCtx = this.staticCnv.getContext("2d");

    this.staticCnv.width = (this.imageWidth * this.spacing);
    this.staticCnv.height = (this.imageHeight * this.spacing);
    this.staticCnv.id = "static-canvas";
    this.staticCnv.style.pointerEvents = "none";

    if (!document.getElementById("static-canvas")) {
      document.body.appendChild(this.staticCnv);
    }
  }

  updateStaticCanvas() {
    this.staticCtx.clearRect(0, 0, this.staticCnv.width, this.staticCnv.width);

    this.parts.forEach((part) => {
      part.forEach(({ x, y, color }, i) => {
        this.staticCtx.save();
        this.staticCtx.fillStyle = color;
        this.staticCtx.fillRect(
          x + Math.sin(y + this.time/10) * this.spacing*0.5,
          y + Math.cos(x + this.time*5) * this.spacing,
          3,
          3
        );
        this.staticCtx.restore();
      });
    });
  }

  addObjects() {
    const geometry = new THREE.BoxGeometry(50, 50, 50, 20, 20, 20);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      opacity: 0.6,
    });

    const cube = new THREE.Mesh(geometry, material);

    this.scene.add(cube);
  }

  updateObjects() {
    this.updateStaticCanvas();
  }

  render(timeStamp) {
    let deltaTime = timeStamp - this.lastTime;
    this.lastTime = timeStamp;

    if (this.timer > this.interval) {
        this.time += 0.15;
        this.updateObjects();

        this.timer = 0;
    } else {
        this.timer += deltaTime;
    }
    this.renderer.render( this.scene, this.camera );
    window.requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch({
    debug: true,
    dom: document.getElementById('container')
});