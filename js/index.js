//for index.html

//npm里面的vue不包含compiler，但我这个项目又不打算用webpack之类的，只好这样了。
window.$ = window.jQuery = require('./js/jquery.js');
window.Vue = require('./js/vue.js');
window.deepCopy = function (a) {
    return JSON.parse(JSON.stringify(a));
};
Array.prototype.removeEmpty = function () {
    for (let i = 0; i < this.length; i++) {
        console.log("i:" + i);
        if (typeof(this[i]) === "undefined" || String(this[i]).trim() === "") {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};


let {remote, ipcRenderer, clipboard} = require('electron');
let counts;

ipcRenderer.on('failToLoad', () => {
    alert("读取文件失败！请检查权限。");
});
ipcRenderer.on('failToSave', () => {
    alert("保存文件失败！请检查权限。");
});

let display, select, search, btnWrap, message;
$(function () {
    ipcRenderer.on('loadFile-reply', (event, arg) => {
        counts = arg;
        message.setText("载入存储文件。")
    });
    ipcRenderer.send("loadFile");
    message = new Vue({
        el: "#message",
        data: {
            message: "",
            timer: 0,
            opacity: 1,
            time: 0
        },
        methods: {
            setText: function (text) {
                if (this.timer){
                    clearInterval(this.timer);

                }
                this.message = text;
                this.opacity = 1;
                this.time=0;
                this.timer = setInterval(() => {
                    this.time += 100;
                    if (this.time >= 3000) {
                        this.opacity -= 0.1;
                    } else if (this.time >= 4000) {
                        clearInterval(this.timer);
                        this.time = 0;
                    }
                }, 100);
            }
        }
    });

    btnWrap = new Vue({
        el: "#btn-wrap",
        data: {
            show: false,
            animation_add: "none",
            animation_fix: "none",
            animation_del: "none",
            timer: 0
        },
        methods: {
            addItem:function(){
                select.show=false;
                display.show=true;
                display.addItem();
            },
            fixItem: function () {
                display.setReadonly(false);
            },
            delItem: function (){
                display.delItem();
            },
            keepShow: function () {
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => {
                        this.hideAll();
                    }, 2000)

                }
            },
            showAll: function () {
                this.show = true;
                this.animation_add = "1s show-add forwards";
                this.animation_fix = "1s show-fix forwards";
                this.animation_del = "1s show-del forwards";
                if (!this.timer) {
                    this.timer = setTimeout(() => {
                        this.hideAll();
                    }, 2000)
                }
            },
            hideAll: function () {
                this.show = false;
                this.animation_add = "1s hide-add forwards";
                this.animation_fix = "1s hide-fix forwards";
                this.animation_del = "1s hide-del forwards";
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = 0
                }
            },
            trigger: function () {
                if (this.show) {
                    this.hideAll();
                } else {
                    this.showAll();
                }

            }
        }
    });

    display = new Vue({
        el: ".display",
        data: {
            transMap:{
                site:"网站名",
                user:"用户名",
                password:"密码",
                info:"备注",
                keyword:"关键字",
            },
            newItem: false,
            isReadonly: true,
            current: {
                id: 0,
                site: "",
                user: "",
                password: "",
                info: "",
                keyword: []
            },
            show: false
        },
        methods: {
            Rclick: function (ele) {
                clipboard.writeText(this.current[ele]);
                message.setText(`已复制${this.transMap[ele]}：${this.current[ele]}`)
            },
            setReadonly(a) {
                this.isReadonly = a;
            },
            addItem(){
                this.current={};
                this.newItem=true;
                this.isReadonly=false;
            },
            delItem(){
                if(!this.newItem){
                    let r = confirm(`确认删除记录[${this.current.site}]吗？`);
                    if (!r) return;
                    counts.some((v,index)=>{
                        if(v.id===this.current.id){
                            counts.splice(index,1);
                            message.setText(`删除记录[${v.site}]成功`);
                            this.cancel();
                            ipcRenderer.send("saveFile", counts);
                            return true;
                        }
                    })
                }else{
                    message.setText("不能删除未建立的记录！");
                }
            },
            updateById(id) {
                for (let count of counts) {
                    if (count.id === Number(id)) {
                        this.current = deepCopy(count);
                        this.current.keyword = this.current.keyword.join(",");
                        this.newItem = false;
                    }
                }
            },
            submit: function () {
                let r = confirm(this.newItem?"确认要新增记录吗？":"确认要修改记录吗？");
                if (!r) return;
                this.setReadonly(true);
                if (this.newItem) {
                    this.current.id = counts[counts.length - 1].id + 1;
                    this.current.keyword = this.current.keyword.split(",").removeEmpty();
                    counts.push(this.current);
                    ipcRenderer.send("saveFile", counts);
                    message.setText(`新增了记录：[${this.current.site}]`);

                } else {
                    counts.some((count, index) => {
                        if (count.id === this.current.id) {
                            this.current.keyword = this.current.keyword.split(",").removeEmpty();
                            counts[index] = this.current;
                            ipcRenderer.send('saveFile', counts);
                            message.setText(`修改了记录：[${this.current.site}]`);
                            return true;
                        }
                    });
                }
                this.cancel();

            },
            cancel: function () {
                this.current = {};
                this.show = false;
                select.show = true;
                select.result = [];
                search.searchWord = "";
                this.setReadonly(true);
            }
        }

    });
    select = new Vue({
        el: ".select",
        data: {
            no_result: [{id: 0, site: "无结果"}],
            result: [],
            show: true
        },
        methods: {
            showByKeyword: function (keyword) {
                this.result = [];
                if (keyword !== '') {
                    for (let count of counts) {
                        for (let onekey of count.keyword) {
                            if (onekey.indexOf(keyword) === 0) {
                                this.result.push({id: count.id, site: count.site});

                                break;
                            }
                        }
                    }
                }
                message.setText(`找到${this.result.length}个结果。`);
                if (keyword===""){
                    message.setText('输入关键字来搜索。')
                }else if(this.result.length === 0){
                    this.result = [{id:0}];
                    message.setText('找不到结果。');
                }

            },
            goDisplay: function (id) {
                if (id === 0) return;
                this.show = false;
                display.show = true;
                display.newItem = false;
                display.updateById(id);

            },
        }
    });
    search = new Vue({
        el: ".search-input",
        data: {
            searchWord: ""
        },
        methods: {
            update: function (event) {
                if (event.keyCode === 13) {
                    if (select.result.length > 0) {
                        let id = select.result[0].id;
                        select.goDisplay(id);
                    }

                } else {
                    select.show = true;
                    display.show = false;
                    this.$nextTick(() => {
                        select.showByKeyword(this.searchWord);
                    });
                }
            },
        }
    });
})
;
