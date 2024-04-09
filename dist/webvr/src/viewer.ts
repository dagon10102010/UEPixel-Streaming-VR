import {    Group,   Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, PlaneGeometry, SRGBColorSpace, Scene, Vector3, VideoTexture, WebGLRenderer } from "three";
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { VideoStream } from "./VideoStream";

// const clock = new Clock();
class UEController {
    pos = new Vector3()
    rot = new Vector3()
    select = false
    squeeze = false
    fromObject(obj:Object3D){
        this.pos.copy(obj.position)
        this.rot.copy(obj.rotation)
    }
}
export class Viewer{
    el:HTMLElement
    camera:PerspectiveCamera
    scene: Scene
    renderer:WebGLRenderer
    hmd =  new Group()
    stateVR = 0
    vrInput : Array<UEController> = [new UEController(),new UEController(),new UEController()]
    leftEye = new VideoStream("ws://127.0.0.1:9998")
    rightEye = new VideoStream("ws://127.0.0.1:9999")
    onCanPlay:(()=>void)|undefined
    constructor(el:HTMLElement){
        this.el = el
        this.scene = new Scene();
        // this.scene.background = new Color( 0x505050 );
        // const gridHelper = new GridHelper( 10, 20, 0xc1c1c1, 0x8d8d8d );
        // this.scene.add( gridHelper );
        this.scene.add( this.hmd );
        

        


        this.camera = new PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 50 );
		this.camera.layers.enable( 1 ); // render left view when no stereo available
        this.camera.position.set(0,0,0)

		this.renderer = new WebGLRenderer();
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.xr.addEventListener('sessionstart',()=>{
            this.stateVR = 5            
        })
        this.renderer.xr.enabled = true;
        // this.renderer.xr.setReferenceSpaceType( 'local' );
        el.appendChild( this.renderer.domElement );
        document.body.appendChild( VRButton.createButton( this.renderer ) );
        window.addEventListener( 'resize',()=> this.resize() );


        
        const c0 = this.renderer.xr.getController(0);
        c0.addEventListener('move',e=>this.vrInput[1].fromObject(e.target))
        c0.addEventListener('selectstart',()=>{
            this.vrInput[1].select = true
        })
        c0.addEventListener('selectend',()=>{
            this.vrInput[1].select = false
        })
        // c0.addEventListener('squeezestart',console.log)
        // c0.addEventListener('squeezeend',console.log)
        const c1 = this.renderer.xr.getController(1);
        c1.addEventListener('move',e=>this.vrInput[2].fromObject(e.target))
        c1.addEventListener('selectstart',()=>{
            this.vrInput[2].select = true
        })
        c1.addEventListener('selectend',()=>{
            this.vrInput[2].select = false
        })

        this.leftEye.onCanPlay = ()=>{
            this.rightEye.connect()
        }
        this.rightEye.onCanPlay = ()=>{
            this.onCanPlay?.()
        }
        this.leftEye.connect()
        this.animate();

    }
    play(){
        
        const tl = new VideoTexture( this.leftEye.webRtcPlayerObj.video );
		tl.colorSpace = SRGBColorSpace;
        const ml = new MeshBasicMaterial( {map: tl} ); 
        const tr = new VideoTexture( this.rightEye.webRtcPlayerObj.video );
		tr.colorSpace = SRGBColorSpace;
        const mr = new MeshBasicMaterial( {map: tr} );
        const geometry = new PlaneGeometry( 9.6, 10.8 );
        const d = 10.8 / 2 / Math.tan(this.camera.fov/2/180*Math.PI)
        const pl = new Mesh( geometry, ml );
        pl.layers.set(1);
        const pr = new Mesh( geometry, mr );
        pr.layers.set(2);

        pl.position.set(-0.02,0,-d)
        pr.position.set(0.02,0,-d)
        this.hmd.add(pl)
        this.hmd.add(pr)
        this.leftEye.webRtcPlayerObj.video.play()
        this.rightEye.webRtcPlayerObj.video.play()
        
    }
    updateEyeVideoSize(){
        const vrcam = this.renderer.xr.getCamera().cameras[0]
        console.log(vrcam)
        console.log(this.camera.fov)

        const d = 10.8 / 2 / Math.tan(this.camera.fov/2/180*Math.PI)
        const w = vrcam.viewport.z/vrcam.viewport.w*10.8/9.6
        const eye = vrcam.position.x
        
        const lp = this.hmd.children[0] as Mesh
        lp.position.set(eye/2,0,-d)
        lp.scale.set(w,1,1)
        const lr = this.hmd.children[1] as Mesh
        lr.position.set(-eye/2,0,-d)
        lr.scale.set(w,1,1)
        
    }
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
    }
    animate() {
        this.renderer.setAnimationLoop( ()=>this.render() );
    }
    
    render() {
        // var delta = clock.getDelta();
        if(this.stateVR>0){
            this.stateVR --
            if(this.stateVR==0)
                this.updateEyeVideoSize()
        }
        this.hmd.rotation.copy(this.renderer.xr.getCamera().rotation)
        this.hmd.position.copy(this.renderer.xr.getCamera().position)
        this.vrInput[0].fromObject(this.hmd);
        this.leftEye.emitHMDInput({hmd:this.vrInput})
        this.rightEye.emitHMDInput({hmd:this.vrInput})
        
        this.renderer.render( this.scene, this.camera );
    }
    
    test(){
        const ls = this.renderer.xr.getCamera ()
        console.log(ls)
    }
}