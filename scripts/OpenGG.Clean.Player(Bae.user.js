// ==UserScript==
// @name OpenGG.Clean.Player（Bae
// @author Fuckyouku
// @description 通过替换swf播放器的方式来解决优酷的黑屏广告 In God，We Turst.
// @version 1.362
// @namespace http://userscripts.org/users/Kawaiiushio
// @updateURL https://userscripts.org/scripts/source/162286.meta.js
// @include http://*/*
// @include https://*/*
// ==/UserScript==

/*
 * === 说明 ===
 * 参考http://bbs.kafan.cn/thread-1514537-1-1.html 感谢卡饭大神
 * Chrome用户也可以使用Adkill and Media download这个扩展
 * 此脚本设计修改人员OpenGG  Harv  xplsy  15536900  yndoc  KawaiiUshio
 * In God，We Turst.
 * THX
 */

/* 
 * Love Jiani
 */

(function(document) {
    var loader = 'http://lovejiani.cdn.duapp.com/kafan/youku.swf';
    var ku6 = 'http://lovejiani.cdn.duapp.com/kafan/ku6.swf';
    var iqiyi = 'http://lovejiani.cdn.duapp.com/kafan/iqiyi.swf';
    var iqiyi5 = 'http://lovejiani.cdn.duapp.com/kafan/iqiyi5.swf';
    var tudou = 'http://lovejiani.cdn.duapp.com/kafan/PortalPlayer_7.swf';
    var letv = 'http://lovejiani.cdn.duapp.com/kafan/letv.swf';
    var players = {
        'youku': {
            find: /http:\/\/static\.youku\.com(\/v[\d\.]+)?\/v\/swf\/(loader|q?player[^\.]*)\.swf/i,
            replace: loader
        },
        'youku_out': {
            find: /http:\/\/player\.youku\.com\/player\.php\/.*sid\/([\w=]+).*\/v\.swf/i,
            replace: loader + '?showAd=0&VideoIDS=$1'
        },
        'ku6': {
            find: /http:\/\/player\.ku6cdn\.com\/default\/common\/player\/\d+\/player\.swf/i,
            replace: ku6
        },
        'letv1': {
            find: /http:\/\/.*letv[\w]*\.com\/[^\.]*\/.*player\/((?!Live).*)Player[^\.]*\.swf/,
            replace: letv
        },
        'letv2': {
            find: /http:\/\/.*letv[\w]*\.com\/.*player[^\.]*\.swf\?v_list=[\d]/,
            replace: letv
        },
        'letv3': {
            find: /http:\/\/.*letv[\w]*\.com\/.*\/v_list=[\d]*\/*\.swf/,
            replace: letv
        /*'iqiyi': {
            find: /http:\/\/www\.iqiyi\.com\/player\/\d+\/player\.swf/i,
            replace: iqiyi*/
        },
        'tudou': {
            find: /http:\/\/js\.tudouui\.com\/bin\/lingtong\/(portal|social)player[^\.]*\.swf/i,
            replace: tudou
        },
        'tudou_out': {
            find: /http:\/\/www\.tudou\.com\/.*\/v\.swf/i,
            replace: tudou + '?tvcCode=-1'
        }
    };

    var done = [];

    function reloadPlugin(elem) {
        var nextSibling = elem.nextSibling;
        var parentNode = elem.parentNode;
        parentNode.removeChild(elem);
        var newElem = elem.cloneNode(true);
        done.push(newElem);
        if(nextSibling) {
            parentNode.insertBefore(newElem, nextSibling);
        } else {
            parentNode.appendChild(newElem);
        }
    }

    function replace(elem) {
        if(done.indexOf(elem) != -1) return;
        done.push(elem);

        var player = elem.data || elem.src;
        if(!player) return;

        var find, replace;
        for(var i in players) {
            find = players[i].find;
            if(find.test(player)) {
                var isReplacing = false;
                replace = players[i].replace;
                if(i == 'iqiyi' && document.querySelector('span[data-flashplayerparam-flashurl]')) {
                    replace = iqiyi5;
                } else if(i == 'tudou_out') {
                    if(/(iid|youkuId)=[^\/]+/.test(player)) {
                         replace += player.replace(/.*((iid|youkuId)=[^\/]+).*/, '&$1');
                    } else {
                        isReplacing = true;
                        if(!GM_xmlhttpRequest) return;

                        GM_xmlhttpRequest({
                            method: 'HEAD',
                            url: player,
                            onload: function(response) {
                                replace += response.finalUrl.replace(/.*[?&]((iid|youkuId)=[^&]+).*/, '&$1');
                                reallyReplace();
                            }
                        });
                    }
                }
                if(!isReplacing) {
                    reallyReplace();
                }

                break;
            }
        }

        function reallyReplace() {
            elem.data && (elem.data = elem.data.replace(find, replace)) || elem.src && ((elem.src = elem.src.replace(find, replace)) && (elem.style.display = 'block'));
            reloadPlugin(elem);
        }
    }
    
    function addAnimations() {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = 'object,embed{\
-webkit-animation-duration:.001s;-webkit-animation-name:playerInserted;\
-ms-animation-duration:.001s;-ms-animation-name:playerInserted;\
-o-animation-duration:.001s;-o-animation-name:playerInserted;\
animation-duration:.001s;animation-name:playerInserted;}\
@-webkit-keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}\
@-ms-keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}\
@-o-keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}\
@keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}';
      
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    
    function animationsHandler(e) {
        if(e.animationName === 'playerInserted') {
            replace(e.target);
        }
    }
    
    document.body.addEventListener('webkitAnimationStart', animationsHandler, false);
    document.body.addEventListener('msAnimationStart', animationsHandler, false);
    document.body.addEventListener('oAnimationStart', animationsHandler, false);
    document.body.addEventListener('animationstart', animationsHandler, false);
  
    addAnimations();

})(window.document);