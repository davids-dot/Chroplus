window.onload = function(){
    if(window.location.href.indexOf('http://blog.sina.com.cn/u/6274555375') != -1) {
        setInterval(refreshSina,5000);
    } else if (window.location.href.indexOf('www.baidu.com')!= -1) {
        setInterval(clearBaiDuAdvertisement,50);
    }
};


function refreshSina() {
  window.location.reload();
}

function clearBaiDuAdvertisement() {
    var h = document.getElementsByClassName('cr-content');
    if (h.length > 0) {
        if (h[0]['style']['display'] === 'none') {
          return;
        }
        console.log("loop begin")
        for(let i =0; i< h.length; i++ ) {
            h[i]['style']['display'] = 'none';
        }
    }
}