const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var window = null;



app.on('ready', function() {
    window = new BrowserWindow({width: 800, height: 600,icon : __dirname+"/imgs/icon.ico"});
    window.loadURL('file://' + __dirname + '/index.html');
});