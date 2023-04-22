/**
 * 该插件目的：
 *   不停刷新本人的新浪博客页面，刷访问量
 */
window.onload = function(){
    console.log('插件进入')

    if(window.location.href.indexOf('http://blog.sina.com.cn/u/6274555375') != -1) {
        setInterval(refreshSina,5000);
    } 
};

function refreshSina() {
    window.location.reload();
}