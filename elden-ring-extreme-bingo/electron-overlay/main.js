const {app,BrowserWindow,globalShortcut} = require('electron');
let win, clickThrough=true;
function create(){
  const url=process.env.BINGO_URL;
  if(!url){console.error('BINGO_URL fehlt. Beispiel: set BINGO_URL=https://DEINE-SEITE/?room=ABC123&name=Alex&overlay=1');app.quit();return}
  win=new BrowserWindow({width:1500,height:900,transparent:true,frame:false,alwaysOnTop:true,skipTaskbar:true,webPreferences:{contextIsolation:true}});
  win.setIgnoreMouseEvents(true,{forward:true});win.loadURL(url);
  globalShortcut.register('F8',()=>{clickThrough=!clickThrough;win.setIgnoreMouseEvents(clickThrough,{forward:true});});
  globalShortcut.register('F9',()=>win.isVisible()?win.hide():win.show());
}
app.whenReady().then(create);app.on('will-quit',()=>globalShortcut.unregisterAll());
