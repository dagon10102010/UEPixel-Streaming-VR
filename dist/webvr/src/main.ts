import "./style.css"
import { Viewer } from "./viewer"

const el = document.getElementById('app') as HTMLElement;
const viewer = new Viewer(el);
const playButton = document.getElementById('playButton') as HTMLElement


viewer.onCanPlay =  ()=>{
    playButton.style.display = ''
};


(window as any).viewer = viewer;

playButton.onclick = ()=>{
    playButton.style.display = 'none'
    viewer.play()
}