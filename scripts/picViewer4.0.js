// ==UserScript==
// @name           picViewer
// @author         NLF
// @description    围观图（support （opera，firefox（GreaseMonkey），chrome） Latest Stable）
// @version        4.2.1.7
// @created        2011-6-15
// @lastUpdated    2012-11-28
// @grant          none
// @icon 
// @run-at         document-start
// @namespace      http://userscripts.org/users/NLF
// @homepage       http://userscripts.org/scripts/show/105741
// @downloadURL    https://userscripts.org/scripts/source/105741.user.js
// @updateURL      https://userscripts.org/scripts/source/105741.meta.js
// @include *
// @match *://*/*
// ==/UserScript==

//fierfox GM环境中：
	//当存在 @grant 时：
		//@grant none 时，脚本直接运行在真实环境，所有GM_函数为undefined
		//@grant GM_* 时，脚本运行在沙箱中，并且只有声明的GM_函数能访问，其他未声明的为undefined
	//当没有 @grant 时：
		//脚本会搜索GM_开头的函数
		//如果搜索到了（哪怕是注释中发现的），那么脚本运行在沙箱中，并且所有GM_函数可访问
		//如果没有搜索到，那么运行在真实环境中，所有GM_函数为undefined


(function(topObject,window,document){
	'use strict';

	function init(topObject,window,document,arrayFn,envir){
		//一些设定。
		var prefs={
			floatBar:{//浮动工具栏相关设置.
				butonOrder:['actual','current','magnifier','gallery'],//按钮排列顺序'actual'(实际的图片),'current'(当前显示的图片),'magnifier'(放大镜观察),'gallery'(图集)
				showDelay:366,//浮动工具栏显示延时.单位(毫秒)
				hideDelay:566,//浮动工具栏隐藏延时.单位(毫秒)
				position:'top left',// 取值为: 'top left'(图片左上角) 或者 'top right'(图片右上角) 'bottom right'(图片右下角) 'bottom left'(图片左下角);
				offset:{//浮动工具栏偏移.单位(像素)
					x:-15,//x轴偏移(正值,向右偏移,负值向左)
					y:-15,//y轴偏移(正值,向下,负值向上)
				},
				forceShow:{//在没有被缩放的图片上,但是大小超过下面设定的尺寸时,强制显示浮动框.(以便进行旋转,放大,翻转等等操作)..
					enabled:true,//启用强制显示.
					size:{//图片尺寸.单位(像素);
						w:166,
						h:166,
					},
				},
				minSizeLimit:{//就算是图片被缩放了(看到的图片被设定了width或者height限定了大小,这种情况下),如果没有被缩放的原图片小于设定值,那么也不显示浮动工具栏.
					w:100,
					h:100,
				},
			},

			magnifier:{//放大镜的设置.
				radius:77,//默认半径.单位(像素).
				wheelZoom:{//滚轮缩放.
					enabled:true,
					pauseFirst:true,//需要暂停(单击暂停)后,才能缩放.(推荐,否则因为放大镜会跟着鼠标,如果放大镜过大,那么会影响滚动.)..
					range:[0.4,0.5,0.6,0.7,0.8,0.9,1,1.1,1.2,1.3,1.4,1.5,1.7,1.9,2,2.5,3.0,4.0],//缩放的范围
				},
			},

			gallery:{//图库相关设定
				fitToScreen:false,//图片适应屏幕(适应方式为contain，非cover).
				sidebarPosition:'bottom',//'top' 'right' 'bottom' 'left'  四个可能值
				sidebarSize:130,//侧栏的高（如果是水平放置）或者宽（如果是垂直放置）
				preload:true,//对附近的图片进行预读。
				max:5,//最多预读多少张（前后各多少张）
			},

			imgWindow:{//图片窗相关设置
				fitToScreen:false,//适应屏幕,并且水平垂直居中(适应方式为contain，非cover).
				defaultTool:'hand',//"hand","rotate","zoom";打开窗口的时候默认选择的工具
				clickOutsideToClose:{//是否点击图片外部关闭
					enabled:false,
					trigger:'click',//'click'|'dblckick'；点击或者双击
				},
				overlayer:{//覆盖层.
					shown:false,//显示
					color:'rgba(0,0,0,0.8)',//颜色和不透明度设置.
				},
				shiftRotateStep:15,//旋转的时候，按住shift键时,旋转的步进.单位:度.
				zoom:{//滚轮缩放
					range:[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.1,1.2,1.3,1.4,1.5,1.7,1.9,2,2.5,3.0,4.0],//缩放比例.(不要出现负数,谢谢-_-!~)
					mouseWheelZoom:true,//是否允许使用滚轮缩放。
				},
			},

			//等图片完全载入后,才开始执行弹出,放大等等操作,
			//按住ctrl键的时候,可以临时执行和这个设定相反的设定.
			waitImgLoad:true,

			//框架里面的图片在顶层窗口展示出来，但是当frame与顶层窗口domain不一样的时候，可能导致图片被反盗链拦截，
			//按住shift键，可以临时执行和这个设定相反的设定
			framesPicOpenInTopWindow:true,
		};


		//各网站高级规则;
		var siteInfo=[
			{siteName:"google图片搜索",
				//网址例子.(方便测试.查看.之类的)
				siteExample:"http://www.google.com.hk/search?q=opera&tbm=isch",
				//是否启用
				enabled:true,
				//站点正则
				url:/https?:\/\/www.google(\.\w{1,3}){1,3}\/search\?.*&tbm=isch/,
				//鼠标左键点击直接打开..（这个只是当高级规则的getImage()返回图片的时候生效）
				clikToOpen:{
					enabled:true,
					preventDefault:true,//是否尝试阻止点击的默认行为（比如如果是你点的是一个链接，默认行为是打开这个链接，如果是true，js会尝试阻止链接的打开(如果想临时打开这个链接，请使用右键的打开命令)）
					type:'actual',//默认的打开方式: 'actual'(弹出,原始图片) 'magnifier'(放大镜) 'current'(弹出,当前图片)
				},
				//获取图片实际地址的处理函数,
				//this 为当前鼠标悬浮图片的引用,
				//第一个参数和this相同，也是当前鼠标悬浮图片的引用,
				//第二个参数为包裹当前图片的第一个a元素(可能不存在).
				getImage:function(img,a){
					if(!a)return;
					return (a.href.match(/imgurl=(.*?\.\w{1,5})&/i) || [])[1]; 
				},
			},
			{sitename:"百度图片搜索",
				enabled:true,
				url:/^https?:\/\/image\.baidu\.com\/i\?/i,
				getImage:function(img,a){
					var origin=img.dataset['origin'];
					if(origin){
						return origin
					}else{
						if(a){
							var onclick=a.getAttribute('onclick');
							if(onclick){
								return (onclick.match(/u:'(https?:\/\/[^']+)'/i) || [])[1];
							};
						};
					};
				},
			},
			{sitename:"豆瓣",
				siteExample:"http://movie.douban.com/photos/photo/1000656155/",
				enabled:true,
				url:/^https?:\/\/[^.]*\.douban\.com/i,
				getImage:function(){
					var oldsrc=this.src;
					var newsrc=oldsrc.replace(/\/view\/photo\/photo\/public\//i,'/view/photo/raw/public/');
					if(newsrc!=oldsrc)return newsrc;
				}
			},
			{sitename:"deviantart",
				enabled:true,
				url:/^https?:\/\/[^.]*\.deviantart\.com/i,
				siteExample:"http://www.deviantart.com",
				getImage:function(){
					var oldsrc=this.src;
					var newsrc=oldsrc.replace(/(http:\/\/[^\/]+\/fs\d+\/)200H\/(.*)/i,'$1$2');
					return newsrc==oldsrc? '' : newsrc;
				},
			},
			{sitename:"opera官方论坛",
				enabled:true,
				url:/^http:\/\/bbs\.operachina\.com/i,
				siteExample:"http://bbs.operachina.com",
				getImage:function(){
					var src=this.src;
					if(/file.php\?id=\d+$/i.test(src)){
						return src+'&mode=view';
					};
				},
			},
			{sitename:"QQ微博",
				enabled:true,
				url:/^http:\/\/[^\/]*t\.qq\.com\//i,
				siteExample:"http://t.qq.com/p/news",
				getImage:function(img){
					var pic=/(\.qpic\.cn\/mblogpic\/\w+)\/\d+/i;//图片
					var head=/(\.qlogo\.cn\/mbloghead\/\w+)\/\d+/i;//头像.
					var oldsrc=this.src;
					var newsrc;
					if(pic.test(oldsrc)){
						newsrc=oldsrc.replace(pic,'$1/2000');
						return newsrc==oldsrc? '' : newsrc;;
					}else if(head.test(oldsrc)){
						newsrc=oldsrc.replace(head,'$1/0');
						return newsrc==oldsrc? '' : newsrc;;
					};
				},
			},
			{sitename:"新浪微博",
				enabled:true,
				url:/^http:\/\/weibo\.com/i,
				siteExample:"http://weibo.com/pub/?source=toptray",
				getImage:function(img){
					var oldsrc=this.src;
					var pic=/(\.sinaimg\.cn\/)(?:bmiddle|thumbnail)/i;//图片.
					var head=/(\.sinaimg\.cn\/\d+)\/50\//i;//头像.
					var photoList=/\.sinaimg\.cn\/thumb150\/\w+/i//相册
					var newsrc;
					if(pic.test(oldsrc)){
						newsrc=oldsrc.replace(pic,'$1large');
						return newsrc==oldsrc? '' : newsrc;
					}else if(head.test(oldsrc)){
						newsrc=oldsrc.replace(head,'$1/180/');
						return newsrc==oldsrc? '' : newsrc;
					}else if(photoList.test(oldsrc)){
						newsrc=oldsrc.replace('/thumb150/','/mw690/');
						return newsrc==oldsrc? '' : newsrc;
					};
				},
			},
			{sitename:"pixiv",
				enabled:true,
				url:/^http:\/\/www\.pixiv\.net/i,
				getImage:function(img){
					var oldsrc=this.src;
					var reg=/(\d+)(_\w)(\.\w{2,5})$/i
					if(reg.test(oldsrc)){
						return oldsrc.replace(reg,'$1$3');
					};
				},
			},
			{sitename:"沪江碎碎",
				enabled:true,
				url:/^https?:\/\/([^.]+\.)*(?:yeshj\.com|hjenglish\.com|hujiang\.com)/i,
				getImage:function(img){
					var oldsrc=this.src;
					var reg=/^(https?:\/\/(?:[^.]+\.)*hjfile.cn\/.+)(_(?:s|m))(\.\w+)$/i;
					if(reg.test(oldsrc)){
						return oldsrc.replace(reg,'$1$3');
					};
				},
			},
			{sitename:"百度贴吧",
				enabled:true,
				url:/^http:\/\/tieba\.baidu\.com\/.+/i,
				getImage:function(img){
					var src=img.src;
					var reg=/^(http:\/\/imgsrc\.baidu\.com\/forum\/)ab(pic\/item\/[\w.]+)/i
					var result=src.match(reg);
					if(result){
						return result[1]+result[2];
					}else{
						var id=img.id;
						if(id.indexOf('big_img_')==0){
							return src;
						};
					};
				},
			},
			{sitename:"178.com",
				enabled:true,
				url:/^https?:\/\/(?:\w+\.)+178\.com\//i,
				clikToOpen:{
					enabled:true,
					preventDefault:true,
					type:'actual',
				},
				getImage:function(img,a){
					if(!a)return;
					var reg=/^https?:\/\/(?:\w+\.)+178\.com\/.+?(https?:\/\/img\d*.178.com\/[^.]+\.(?:jpg|jpeg|png|gif|bmp))/i;
					var matched=a.href.match(reg);
					return (a.href.match(reg) || [])[1];
				},
			},
		];

		//通配型规则,无视站点.
		var tprules=[
			function(img,a){//解决新的dz论坛的原图获取方式.
				var reg=/(.+\/attachments?\/.+)\.thumb\.\w{2,5}$/i;
				var oldsrc=this.src;
				var newsrc=oldsrc.replace(reg,'$1');
				if(oldsrc!=newsrc)return newsrc;
			},
		];

		//图标
		prefs.icons={
			actual:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODU3REI0OUYzODlFMTFFMjg5MDlGQTIwQUJFM0JFQUUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ODU3REI0QTAzODlFMTFFMjg5MDlGQTIwQUJFM0JFQUUiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NTdEQjQ5RDM4OUUxMUUyODkwOUZBMjBBQkUzQkVBRSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo4NTdEQjQ5RTM4OUUxMUUyODkwOUZBMjBBQkUzQkVBRSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgugZKIAAAFgSURBVHjatNWxqoJQGAfwSqlBxKHJthSHgpZwD3qBBukNfIgG6Q0iRPfAVgejod5AUmpw1UEcHBpKDHTr3HORe9Gutwse7384cI4fP44fftgEADRqSS0QRFqNmvJv0Hg8Nk1zNpsh9Wg4HMZxfLlcqiB5aL/fw+1qtUJt9nQ6hWsURag9StMUroPBAPU72m63cPt4PLrdLlKPGIa53+/wRNM0JCh7r91ud7vdlsslEvRnKIpChTqdjq7rsN627V6vVx1SFAV85XQ6YRhWBeJ5/vl8glxEUawCHY9HUEwQBDiOl0Msy57PZ9d1R6NRXoEz+HKdLPP5vAQiSRISWcX1eu33+9+QLMugLIZhlEDr9TpfZFlWu93+HKJWKwzDUihJEoIgChBN0/D0pU6SJPhoMpmA3yMIQgFaLBY/i+AMcxynquobaLPZFCDHcUrrDoeD53lvIN/3M6hZ1+/oQ4ABADUj3dmrBfLZAAAAAElFTkSuQmCC',
			current:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MkFGMjYxQkQzOEEwMTFFMkJBMzdENzI0QkVEMjM3NjgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MkFGMjYxQkUzOEEwMTFFMkJBMzdENzI0QkVEMjM3NjgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoyQUYyNjFCQjM4QTAxMUUyQkEzN0Q3MjRCRUQyMzc2OCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoyQUYyNjFCQzM4QTAxMUUyQkEzN0Q3MjRCRUQyMzc2OCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PkXfwy0AAADoSURBVHjaYvpPJcDCwMDAyMjIQBkAGsTEQCVANYNY0FxIkmbkMGHBI0cwXGjiNewGffr06dy5c1QwiJeXd//+/dSJNUlJSZLTEiYbyPj8+TNJGrG7SEtLa9++fXV1dZS6iAyNxEb/5MmTIZnz5MmTFLno379/8IxOgovOnj17+/Zt5CBDTvGhoaFEuQiYiCA2KyoqQsQnTpyIXPRs2LABi0Y0PjD5fPv2Da6npqbG3t4esxgLDg4mYFBFRQWyhu/fv0+ZMgXToPnz56NpZARhmP/JLkagRS0ZZQgNS0iqFrWkBg1WABBgAMViMFcYqRWbAAAAAElFTkSuQmCC',
			magnifier:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpFOUE5RjA0RDk2MzhFMjExQTU0REJGNDRCQTFCOUNERSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2OTVBMUFDOTM4QTMxMUUyQjU3OEY5MDVFQzA5NDg3NiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2OTVBMUFDODM4QTMxMUUyQjU3OEY5MDVFQzA5NDg3NiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU4REEyMTVBQTMzOEUyMTFBNTREQkY0NEJBMUI5Q0RFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU5QTlGMDREOTYzOEUyMTFBNTREQkY0NEJBMUI5Q0RFIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+c9dtRgAAAdpJREFUeNqsVS3LwlAUdjIFgx9hCyJDRPEfKIqMBe2GMbCYzDMb/BN+NAWjRottRsMQ1gWLwWawqEFh78M72a53H4LshnF37nOenfOcc+4Y0zQjoaxQiEASpUw8z/d6veVyeTwen88nntjDAnswFwMyhmGsl2azqarq5XLRNG2/359Op3w+X6lUWq0Wx3GTyWS73fqmZacGFvi3221PKOw4BcaP6B0RIp/NZovFAuH4BS+KYrfbzeVy6XTayeg/GyciqDCfz7FpNBoBQgADpLtQjthQAZFTbqvVirIAA6TnN95EUBTqkge1Wi2TyVBoYIAMqhoqnUgkXq8XUtvtdogFZXo8HrfbDaBOp2OhWZaFMRaLORpTGqFfisUiqRE2m82G+iwwQAZp5BlzPB6nLG4FaI3cKhqG0e/3BUEgjZ41+QgPfbRer9F1AeXHKTDkrJCp0Z09GAz8WJDU4XAAXtd1NxFrQ605Go/HpVLJc9ZSqVS5XAamWq1+v0au16s1/efzGd1gT3+9XjeJpSiKb2okbzKZtBwKhYJlH41GJBHE+k6UzWbv97vtMxwOJUkyXUuW5S9E0Jt0QCtPp1M3Ea4KkujjYvvh5rVHhPU8+GFFIyEtNqwfyZ8AAwDsuJgtGILBsQAAAABJRU5ErkJggg==',
			gallery:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTEwMDAwRUIzOEEwMTFFMjhEOEM5NkVGODMwQkUyRjgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MTEwMDAwRUMzOEEwMTFFMjhEOEM5NkVGODMwQkUyRjgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxMTAwMDBFOTM4QTAxMUUyOEQ4Qzk2RUY4MzBCRTJGOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoxMTAwMDBFQTM4QTAxMUUyOEQ4Qzk2RUY4MzBCRTJGOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvbSbv8AAAD8SURBVHjarJVBDkQwFIZ10q0DWNq6hEOIu1iIOwh7V3AC1hZcwC1I2HnTmWbedMqUVv+ElPZ9/veirwQAHCuyAmIQaoYjhEhvqGJOKwlqliZfKX6bnnq+6IveKb/oi16s5amvh2NJKtA0TcMwWAC5rtu2rQUQk+d5eltkf+eDeZ4vhqscBUHQNE2WZXcdaYU/tMpRFAW81XXdX2SSJKeOtm2Dj+SEcMTFfOGivu/HcRRLBoLiOD4AIR59sZ+IB/i+z2fzPBdBdV2rQOhrWRZ8TNM0DEPYKYqiY5DkC7Wua1mWe1BVVQgir+t3rxu03W/PNushcmOzcpA8BRgAZvU/uPa6ZfkAAAAASUVORK5CYII=',


			retry:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzIyMjhBQTUzNjdDMTFFMkI3QThBNTAwQUMxRDJGREMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzIyMjhBQTYzNjdDMTFFMkI3QThBNTAwQUMxRDJGREMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMjIyOEFBMzM2N0MxMUUyQjdBOEE1MDBBQzFEMkZEQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMjIyOEFBNDM2N0MxMUUyQjdBOEE1MDBBQzFEMkZEQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pj9mTMsAAALCSURBVHjadFJLSFRhFD73v4+5d+4dmgkkEcxFOOo4OQ90FgVJ2lhihFk5ozWKGxeBBEWFmA/GzFVFu1xFRrVrHbiJaGVqCDUZEdKAi1mkQjWv++r817kXW/hfzv1f53zfOf93mNraWjhoMIQBQsiiaZjXDcP4s/8um81aMzHh4I/neJBlOSUr8meWY9tpgH1nD2KtbcPBEjYmCMIbSZR+u91u0+PxAFqdoijveIF/yDCMsC8eONM07XQFZJyS3NK4y+UiCAIcxwHP83vALEv3N/N/813FYjGBRxkHAOsEURSfSpI0IrtlQCYrANkcJgpI96FwqO5K/2WPk4H147gOTHlEkRXgeA7CkTAkBxLgb/BD34VLQFisFImSA0lIDibeY8iGA0BRa2pqZstq2XJsamqEqZnJt3g3fepE+7LiUUzfYR/cun0LotHIdFskli6Xy7C1tVUBQKlUXW2lZaiqCr19vatt0Vh3qVSy0g4EAzCTntmtrj7SH2mJLmmqBva72RmwxUJRwPotAJ/Pd6dULIGu66ARDR4/efQJ73pbmkNZerZfAUvGtfVVQIkAGwU0TYMHc/M56khZKCAGnww2Hs/qmi4h2ShmOopzwgEIBcN6vb9epcEUZHNzc9ZqFQQwdAOa6gMFeo4NdVd0iQuiJC6g/5gDQNnOdZ9dozN90EK+cBFVWQAGDlVqFVDSCWS+hz1C5YaxG2P5/wDiXfHJM/FOR2+UdBSbaRfXPwWXUELW+9gbLO2NnvM90NF5Ou08Ik2zuSG4tLq+slhVVTX06uVrwCDA3qdlHKVZ0UBqV68NQmo49Qz9P+Ryub0O9vq8QBgC335sCLifynzJjC8+f0FWPq4A1Ztm1NrWCkPDKSPQHJhHn7T/WEN5+9d2BcDr3VtUmL5+z8RwO4EWR5PQCmhLaHP4oMu2Qjs7O1bcPwEGAErKEckpB5KiAAAAAElFTkSuQmCC',
			loading:'data:image/gif;base64,R0lGODlhGAAYALMPACgoKOnp6cnJyaamppmZmVhYWGdnZ3d3d4aGhgEBAdnZ2UNDQ/b29r29vbGx  sf///yH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/  IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRv  YmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwg  MjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8v  d3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiBy  ZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxu  czp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0  dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9y  VG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9Inht  cC5paWQ6QUU5MTZGNDMxQ0E4MTFFMkE1Q0NEMTFGODU0MkUzNzUiIHhtcE1NOkRvY3VtZW50SUQ9  InhtcC5kaWQ6QUU5MTZGNDQxQ0E4MTFFMkE1Q0NEMTFGODU0MkUzNzUiPiA8eG1wTU06RGVyaXZl  ZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBRTkxNkY0MTFDQTgxMUUyQTVDQ0QxMUY4  NTQyRTM3NSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBRTkxNkY0MjFDQTgxMUUyQTVDQ0Qx  MUY4NTQyRTM3NSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4g  PD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb  2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOi  oaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1dHNycXBvbm1sa2pp  aGdmZWRjYmFgX15dXFtaWVhXVlVUU1JRUE9OTUxLSklIR0ZFRENCQUA/Pj08Ozo5ODc2NTQzMjEw  Ly4tLCsqKSgnJiUkIyIhIB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAACH5BAUFAA8A  LAAAAAAYABgAAATMMMlJq710GQQAMgBmLYMSKMuirMQiSocZnOlqH68h06qtFJhPomASEDoEwQpY  MFQWM2fhEJoADkyBwDVxMBgBp6igVBAm0C8D8YqtBFWDWlHFABo2MQLMGLwkCFoCbAkAKQt1IoaL  Eh2Of4WOVQUDBANiL4ENAjgJJAOViRYADoJAhZagpxgGgg11BqAtLwWbgxQABLMaiQAGLrUNXGgu  JA4EVB4DDQ7AmE8DDtIDHQ4N18200dIO1dfMq3YI0dSkDQMckI1NHb+i6vARACH5BAUFAA8ALAAA  AAABAAEAAAQC8EUAIfkEBQUADwAsAQABABYAFgAABJbwySkPoYtq6gILEzhsmsd8YQCS4YlK6roV  meEpY0gdE0AQNQRLolBMDoMBcEiUjHzJQYFJUSwW0QtVQCkoBwbqg1A0PgBo8SSj3mRqjjhPLVAI  444cs1EOD/BhQwdlXA8HcXpDdQpaD0lMcw8ChRJTEg4NiQ4CDZYsmA0NDhINk5yeG6ANE6WTq0MZ  mKMPpa9tcweoFBEAIfkEBQUADwAsAAAAAAEAAQAABALwRQAh+QQFBQAPACwBAAEAFQAVAAAEgvDJ  +cAykhzKJzjEQABPwARONxXhIJImc6rP0r6lfGKqLfIDxe7Bk7gki0IHgSlKHI4BjRMIGKGpqaRq  fWC1FK4BuwGbz+gOqfFgmwkKhaRBPws4dPdZ3m5ktXwUWUoqhHEdBQ0CDggZDYGFigICbgJxCncq  BpKUEpZxAk4dipWYHREAIfkEBQUADwAsAAAAAAEAAQAABALwRQAh+QQFBQAPACwBAAEAFgAWAAAE  n/DJKcs0C9A9FxrO8ADEQBzcBjrhWA6mlT5rS8Lmwhky+KAPQ4mgeyA6LFmqUAwEZIhGw6FMGQIM  BkXaMMwkiKz2UeCKvhKFGNUAoyUDBpbwrkuK9oXuIGgIjnYTBQKEDnZOARJ+hEAzCIgPOgiEDVUz  TmcPUjKNE4AzMgIKbRMCDwoSBp2lCq2mC6hpaKKukbF2BKICerFEdQsGgJ8cEQAh+QQFBQAPACwA  AAAAAQABAAAEAvBFACH5BAUFAA8ALAEAAQAWABYAAASU8Mk5zyw0a9ecHM6AABrFNd3nrEMpFWf6  gKz7eq10gPmCTaiJwbYgEEgSgaBhkxQHA8ujoRQ0HwUolFT1XAnagoV6lRgG4GE5A2hTkGuKQvEg  lAeMAMM+VzCvCgyCUn1lgnkTc1ZNBnoMXg9KV0ONARRqDwoBAnYSmg+YJXQBAXQSpJahGZ+lE6im  TXQKSK1rcGYuEQAh+QQFBQAPACwAAAAAAQABAAAEAvBFACH5BAUFAA8ALAEAAQAWABYAAASV8MlJ  5amYkiaadI3zLJlkcEL3NaxYPqj6gO0rcQ5ChUWWSj2MYTIYkB4EhUJgkwwcOYlAqbjYoK4H1dOc  QaVMQvfgeEpIx25lwVY/APCHTqs2DAiD4YTZxBdJfHI2BUV3AEgSCk0LflYkihJzGYwEhxV6FAMP  DAFnQRRDnWcPAQymohlWoiSlpg9WJZqdrAwPml1pTREAIfkEBQUADwAsAAAAAAEAAQAABALwRQAh  +QQFBQAPACwBAAEAFgAWAAAEi/DJKQ2iOFOhhGxCo2Gc0n1C2hjjU54PqBbZMXGihDjhxE6mloT2  cDgAGIVQ4mjkHsplxdlwPH5SyYAqMUWzVpsEmS2bywfHwGoIuL9Co4OmcAek8sHEnV1bgVeBGQUL  WnoUPwEMCocGBAMEhS2KDAx3AI8DkJIalJYPmJqbcYqXjwQGZEsHBEOcGBEAIfkEBQUADwAsAAAA  AAEAAQAABALwRQAh+QQFBQAPACwBAAEAFgAWAAAEk/DJSSUyNc+hnlqPoAiENh2dlIrKaKrTF7au  hnlhKTV1YUuHTPBRaDRAj0Eg8JoUBQLKktkMQRuSabTqgEYR1KpF0NhKkOK0mhFgDNSOR5BBTw+M  WAmdUTXgN3QBNy8ORghSZz4Vgw5xJ2cEAwQ3BwMOby8LkQOSAEmNly8Fm5yelo0DihoAB5EEppdD  VQALN4MZEQAh+QQFBQAPACwAAAAAAQABAAAEAvBFADs=',
			loadingCancle:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6MzBFMjYzRTUxQ0IwMTFFMkE5RkRDMDFGNUY3NTA2OTYiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6MzBFMjYzRTYxQ0IwMTFFMkE5RkRDMDFGNUY3NTA2OTYiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMEUyNjNFMzFDQjAxMUUyQTlG  REMwMUY1Rjc1MDY5NiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMEUyNjNFNDFDQjAxMUUy  QTlGREMwMUY1Rjc1MDY5NiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmI2XfsAAADqSURBVHja7FTLDYMwDI1puwQr5MCJKZCy  B3cklsg9GzAAEjAEezBFhRtHISr/T9VD1VgyJP68ZzsBQET2TQFP8McEaZoGJ7F6pdTMeN9KaNv2  nR3iODYLbaeX82k7nO6g67oRiBCC6VgDBABYluUIhx5hGM5w9sbgKrOARLgIfrWDQXCvgLUOVgmi  KGJ2HEarqhoFJklicod8zjkriuL0iLY6OHS/jxCgrn5mtDb8lADrunabPM8fpMPe+vASAc20aZrp  gT6tusOlGIpdk60PLciy7EYLKWW/dIO0P5gU2vu/qSf4QYKXAAMAJ5qBE+5PPaUAAAAASUVORK5C  YII=',

			hand:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6QjI3OEJEQkYxQ0U3MTFFMjg5NDZFNzJBMTc5RTBBMzMiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6QjI3OEJEQzAxQ0U3MTFFMjg5NDZFNzJBMTc5RTBBMzMiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpCMjc4QkRCRDFDRTcxMUUyODk0  NkU3MkExNzlFMEEzMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpCMjc4QkRCRTFDRTcxMUUy  ODk0NkU3MkExNzlFMEEzMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjEL5KQAAAHBSURBVHja5FRNywFhFGVmkM9EEaWQEik1  Fqws/AWJn2Dl/8haKTsW/ANljaQslLLwka98NjNOpvTkfeadUXo371k83bndOXPuufcZfT6f130D  jO5L+EOi0Wg0GAxUyzhqdj6fX6/XYDDIsmytVlssFo1G43w+z2Yzh8Ph9/u1KspkMsViURRF+dHn  8+G0WCzVarVQKHygqFQqCYIwHo+Px+MrGY1GcTqdzg882mw2OMPhMOheSbvdTvY+nU7ViWCKJEmx  WOx0OklPrNdrtCbHt9stnU6Xy2V1ot1uB4O8Xq/b7RafQEfJZBLB/X4/HA5YY7PZTL7CxuNxOdpu  t5g0JNhsNqPRGIlE8PFUKiWrgAQ5QNcejycQCGCsqKcQ8TxfqVSsVmu/30d1NpuVaHC5XGAxmUyt  VgtfpUxtuVxyHIfBJxKJer2+3+9hitL6YaFQT28N9AzDhEIhGAF1l8vFYDBQRWFLu90uKed9j3q9  HkwFF4rgJTl7EhC7Wq1U9qjT6UAzLBCVIW+Z+kI2m01MEIGgAK1EQLvdFpTxZvNvRPBoOBxS+8IQ  cD+0XlpgMpnkcrmfefIak9D/53+2RjwEGAAlkHhWHev9/QAAAABJRU5ErkJggg==',
			rotate:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6RjM2M0UyRTcxQ0U3MTFFMjgxRDNEQkM4N0Q3NTg2QkMiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6RjM2M0UyRTgxQ0U3MTFFMjgxRDNEQkM4N0Q3NTg2QkMiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGMzYzRTJFNTFDRTcxMUUyODFE  M0RCQzg3RDc1ODZCQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGMzYzRTJFNjFDRTcxMUUy  ODFEM0RCQzg3RDc1ODZCQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlX779gAAAJXSURBVHja3JQ5a6pREIbzqbigoqBeNyI2  pghEAnZiJZZ2/gMLQZBgoYUEXIJgYyD+gYhYxcJGtDKQH6CIImKhuIAGFHHfl9yXyPV6DZoUKS6Z  YjhHzzxn5p05H2EwGM6+w0hn32T/H4hy7I/RaNTpdCaTCYVCWa1W6/X617vVajV4BoPxOQgx1WpV  oVCYzWa5XD6fz2k0Gn58fHxMJpMmk+n5+RlbMpm8H0UcdA0n6vX67e2tQCCIx+OlUqlQKFxeXl5f  X+t0OuQokUiAttvtfD5/n3Wo0XA49Hq9r6+vgUAAFKSGLXw6nQady+WiWFx2c3OD+05lpNfrZ7MZ  SsAa8R6Ph0qlLhYLv99/d3fH4XB2J/v9Pi47CtpZLpfTarVisVilUkEjsFwuFyT7avszmUyr1cLC  arUul8tsNnt/f48t8kJ2yPGrIIfDgRgsNBoN2ux2u5VKZT6fh3aQ1ul0HmMdglgslsVi2Sa1NQj8  9PQUiUQwTSQSCZJXKpXPQegFhCAIYrPZNJtNeOTi8/l4PN763cBC1h9ZpH11Go0GWo6bUQK80WiE  Pz8/Z7PZ0Gv9x8B6eHg4CrLZbEwm8+XlBY8ABSKATqfDq9VqeIzfDiQUCkOh0NEngmvRl0Qi0W63  RSLRwblutwsEFlKpNBgM9nq9gwNkjP92hXbIZLKrqys8js2/ViwW397eoDooyAWjeEpsDHQ0GsUL  WH0w5IhROEE57BpYsVjsIwjtu7i4CIfDg8Hg2ED+LW1r4/EYg4dm7+pKpVLlchkjPp1OT3zYiJ/7  8f8twABFT5G5Yf+a5QAAAABJRU5ErkJggg==',
			zoom:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6MzI2NDFENzExQ0NBMTFFMjhDOUNGQ0NDOTYzODI4REUiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6MzI2NDFENzIxQ0NBMTFFMjhDOUNGQ0NDOTYzODI4REUiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMjY0MUQ2RjFDQ0ExMUUyOEM5  Q0ZDQ0M5NjM4MjhERSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMjY0MUQ3MDFDQ0ExMUUy  OEM5Q0ZDQ0M5NjM4MjhERSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjUXtsUAAAHTSURBVHjazJTHakJREIZzc63YS2xYsKx0  5cYXEHwBfQb3PpgbwRdw60oXtoWoWBAL9i7mQyGERMNNWeRfXA4znO/M/GfuEZLJ5NNf6Pnpj/T/  QLK70cPhMBgMlsslC4VCodPpnE4ni++BVqsViFQqFQgEjEbjbDZrNpu5XA6cVqt9BBLD4fCHWuRy  eSaT4fxOp1Ov17fbrdvtTiQSpVLpdDqJoijJo/1+n06nQTQajcvlQkXn87larbZaLeJkpZodj8fp  pd/v04UgCFD46vX6Xq83nU7JSgX5/X4oarWawyFOJpP5fL7b7TQaDXGyUs2mF7ygKTafryKITSqV  itKi0ajUiqjCZDJh6of48XgkTlYqaDQacUcc/nyVeNVt7fV6y+UylUoCFYtFs9nMBMES3ykYDNps  NpfL1e1277LuzNFwOIzFYlarFYPokUUkEgmFQuv1+uWqQqHAncpksq9AaLFYMERs8Hg8ZNnD3dGa  wWDgGIfDYbfbP7ME6e8RPw30zWbDGrOy2azP53sb9DsVPVKlUuEe+OPwiH6xkgjz9W0QqtVqsGjq  xrrN6g/fI56B8XhssVgY3bdyHr5HXyufz+OOUqnkB/wVCLXb7X//Zr8KMADSBu6sAZizOwAAAABJ  RU5ErkJggg==',
			flipVertical:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6Mzc5RkM3NzYxQ0Y0MTFFMkFGQzk4NzFDMzc4MTVBMTIiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6Mzc5RkM3NzcxQ0Y0MTFFMkFGQzk4NzFDMzc4MTVBMTIiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozNzlGQzc3NDFDRjQxMUUyQUZD  OTg3MUMzNzgxNUExMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozNzlGQzc3NTFDRjQxMUUy  QUZDOTg3MUMzNzgxNUExMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PoWGg/MAAAFCSURBVHja3JTNboMwDMftaVyKVlrYCU68  Ae/Ci/MQE1JRCuok1gNCnuMExgQEJnGaUaIA8S9/fwDmeQ5H2AscZIeBXqc3Xde1bcvzppvneb7v  87wMSpIkjuOdEsqyrKpqGcSUoigQkPQgQuQZkN8gkKz0JUuALMtWQWxBEOyRQ+4csYXXUCTovYR6  IGo3lHsYFRJtgKL3SPbooSMD8TPBoDxGOYeo73snKArFGa2z4AxJpOEo7XarXKArhzac7TKEDdDb  +Qw/9TGx2AFDesAG7MyRfzqtVAn/0NlsX88n6BzIhNNiGyGms+ZFm4E+H495OrYStgSq68Y0r9QK  x8sCLdH0lhN0r5XeRxYCQ3bpl7gFkTOQuoNtOrQlI3HTeZl8bQCX4OICNU2z8+t3gZRSaZruBPHm  VdCH2H/5Zx8G+hZgAJcamqB3G0N7AAAAAElFTkSuQmCC',
			flipHorizontal:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6NUVBRDRDOTkxQ0Y0MTFFMkI0OUU5NThEQzI4NTFGNDMiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6NUVBRDRDOUExQ0Y0MTFFMkI0OUU5NThEQzI4NTFGNDMiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1RUFENEM5NzFDRjQxMUUyQjQ5  RTk1OERDMjg1MUY0MyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1RUFENEM5ODFDRjQxMUUy  QjQ5RTk1OERDMjg1MUY0MyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pnl92swAAAFKSURBVHja3JTJjoMwDIbxqBw6SKVAT3Di  DXgX3l9cRkhFLKIjekHIk9gJoXQhB07jILPFX37bAcjz3NnDvpydbDfQYXkzjuMwDMJvhrmu63me  8K9BSZLEcWwpoSzLqqpegwSlKIogCKJLFIWXMAxOvv99PA73++/t1nVt07RN3bRd2/d9lmVL0Lsa  gRhkSA75Sp7h4fUnEIhZKkhPpzhyqPBg1TVAMcBEMJnRjAJECxBKkloUlo+FWLkG8S1SU8sDPjDm  M2u0UwScnJFDUCEHqIIrpR9qhHIAeZ2Tfj4rsUptlZW6RWSk2RAbIFw2Ho2nxFSN0E4RzUe9qUxi  YPTZ1Agck5rqDhdbooC1gGNZbN7JWpFOEFbpb9VIBZnNrLCyj6KZT4znr7+u6zRNxcU0Tdequi4+  7tn881kcPPkt6Ifsv/yzdwP9CTAAzDedWzss4SgAAAAASUVORK5CYII=',
			close:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAARCAIAAAAt9wkYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6Q0I3NzA1RDAxQ0Y3MTFFMkJGMTU4MTc4OEQ2N0MzQjkiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6Q0I3NzA1RDExQ0Y3MTFFMkJGMTU4MTc4OEQ2N0MzQjkiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDQjc3MDVDRTFDRjcxMUUyQkYx  NTgxNzg4RDY3QzNCOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDQjc3MDVDRjFDRjcxMUUy  QkYxNTgxNzg4RDY3QzNCOSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmUW1owAAADqSURBVHja5FWxCoQwDL2W+x4X/QmHujvX  zV0XadHN31HUn2gR/KD2AgWRAytETpTLEF5eSfqaaEvyPH/dw97W2rtIMcY8uytKKQeiKPKTP5fS  dZ0DSZKEYQhAa72SdV0japIsy3D9XPdjjIHv+96FUkpPFqV0VwrnHD3dpmm+GCHEwdEJ2VVpTlhV  VdtaEB6m2H2j9oTN87yVAuFhikclviuw8TAMWykQAonuCvJeWZZlmiaHy7IE37Yt+HEc4zgOggBR  EzmgVUdRFI4B4BhYwg2IpGl65ZXq+ZmvfoM838MfP4fPGNBHgAEAi7gyuvHuhZcAAAAASUVORK5C  YII=',
			rotateIndicatorBG:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALoAAAC5CAYAAACfmiVfAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEu  MC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVz  b3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1N  Ok9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowNDQzRDlCNjE4MjRFMjExQTlDNjhCQTlBOTYy  NUVGMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRDEzOEEzQTI0MjAxMUUyOTRGREE2Njky  QjdBREQ5OCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRDEzOEEzOTI0MjAxMUUyOTRGREE2  NjkyQjdBREQ5OCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dz  KSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjMwOTI1OTNB  MUUyNEUyMTFBOUM2OEJBOUE5NjI1RUYzIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjA0NDNE  OUI2MTgyNEUyMTFBOUM2OEJBOUE5NjI1RUYzIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpS  REY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Q3ni7gAAGahJREFUeNrsXQtYVOW6  XjMDAwgICqgwXAxJaKuZl9BM81H3U9pRi+5aZFm5O6fc5Tm6PWUXd1m7jpW1s55qG2rb7badmnY5  aRePl8obiaKiKIxyFwQRGBhghuF8H/OvWozDMPdZl+99nu+BNczAYq13fev93v/7/xW0atUqjuAX  REKoIBoXLVoUhC/AsTfTYfEMcCydep+aDpXfkACRzL4PhehDh8R/IKL7l+hJ7PsQRnaCnxBEh8Bv  0AmyeBglGSK6nDN6pEC60LEnosuW6NEC6RJMh4SILleixwoyeggdEipG5arR+7Loki68zUggossF  MXwGNxgMqfBFw14ni5GILrts3gWTyZQqeJ0sRiK67PS5tSgKCkoRvB5Gh4aILkuiq9XqJCI6EV32  0gUyegJJFyK67DN6cHBwvOB1KkaJ6PLM6CBdwpOSkniCk8VIRJcN0EocKHwhPT09lrI6EV1uGMj9  5pt3IT4+Po50OhFdtvqcR79+/YQZnZwXIrq89DmPyMhIIjoRXf4ZPSwsjKQLEV3+GT00NJSKUSK6  /DO6RqPpQxYjEV1uiLf3IlmMRHQ5AVtz4+yynyxGIrqcZQsPshiJ6LKXLQiyGInockJiTz8gi5GI  roiMThYjEV1O0PX0A7IYieiKIDqCLEYiuuylS9cPyWIkossAuPxcX0dvIIuRiC4HJPR6JZDFSERX  AtFtLEYiOhFdkkjs7Q02FiMRnYguv0IUQRYjEV0R0gVBFiMRXerQOZX2yWIkoisho5PFSESXMpC8  Ti30TxYjEV322byL2WQxEtGVQHSyGInoiiA6WYxEdClD58qbyWIkoss+oyPIYiSi94QpHOsMhFt9  jAhv9y5ldAlYjFEQN7HjHQzRn4juH+RBvA8xAaIR4loRHfwrlonuDSK3GJHgf8VjjkkFvg5nx5yI  7gdchvgbxDurVq1aPHLkyGo8AXAiroYI9P90xTLRvUGkFmMExHKIN1pbW1fDccXend9B6OGYm4no  /sMeiK8h7nzooYfeu/fee3GiA56MMXBS+kpFn3eJcvFZjOMgPoWY2dLSsumZZ55RwfeDIMqA5A2k  0f2PtyBqIBLHjx//4uLFi6eHh4djJhoJZL8qQNld5+oHRGQx4j48C7Ea70xtbW36FStWHGEFchNE  KRWjgQFqxZchOvF/0el0Ny9btmzRpEmTMKviYw6vA9KEiz2jIzIyMuJsCOdvjIbYBHEHhMpisbRt  3rz5U6PRaIFtlCqnIZtbiOiBw36IzwV6NyErK2vRE088MVWr1aKcGQVkT4JQiTWjIwYNGiSUL/60  GLEn5z8hPhBepCdOnNiWm5t7kW2iLjdKmSRy8dHfhqjkN1QqVVBaWtrM559//slRo0ZhpryKOTP+  0L9uZfQAWYwjIP4BMVfIhfr6+vy1a9ceZJu1QPILUieIXIjeAvFnJmF+sw0iIq564IEHljzyyCPj  1Wo1esGjmXvgS7j1+/1sMWohFkJ8DDFY+AOTydSwbt26f7HNNoizciCInEZGf2Eas/s/qFZrhw8f  fs8LL7ywYOjQodHwElqQaEVqfSQD4tz5oB8txnSIv0PMs3P+O/ft27extLS0hW0XQjY3EdHFh9U9  OQNRUVEZCxYsWDp37tzrYBMHl8YC2eO8/PcT3P2gHyxG9PYfg1gPMcTeG8rLy/d8+eWXfAYvB5Jf  lgsx5EZ0vNUuh7DrDqCNd/311z+4bNmy7KSkJPTarwGyZ3jRznOb6D62GIcwgv8Bf7e9NxiNxooP  P/zwf9mmAeK8nIghx6aufHZr7hGxsbGjFi5c+KesrKwM2BzAWQeZvNFCoPPkwz6wGNVMouDxyOjp  TRaLxQSZfIPBYEAbsYOTuJWoFKIjPoQodvSG4ODgvjfddNNjS5cuvSsmJgZtSG+0EHhU6HrZYkyG  WMOKTof1SGFh4Zf79++vZpvngOQtciOEXIneDvEiZx3ocAQVkGvCEsAtt9wymPO8hcCjjO4lixHP  6X0QGyGu7e3Nly9fLlizZs2PbLMOSF4pR0LIuR/9NESOU1ZJSEgMEP1JIPhMD1sIPCK6FyxGrBFw  4GexM3cEs9nctGHDhk0gXfjkcFauZJD7xIscRvheoVKp1MnJyVNZCwES1p0WAo+kiwcWI4764tA9  2qujnfxM58GDBz8tLi42sO0zkM3biejShJlJmHYXyIYtBE+72EKABe1KrpdlonuDmxYj/u13OGsz  ltMFbFVV1c+bN28uYJuVQPJLciaCCv5BTgGYx4oyl2AwGM5t3bp1Y15eXh1sNrCsZ9vzcSfEHyG8  0jzW1tZWU1tbewoKxJM7d+480d7eXgsvIwkb4G932rx9JsR/cda12J1Ga2tr9euvv/4m6HNMBM0Q  eVJ1WSABEdFt7lw43D3C1Q+Cfm0vKCjYvnbt2v3wPVpv2OBUxVlHQZdB3OqrnTaZTI2QeXP37dt3  MDc3t5yztiRfgL+P2f45jk1vcwWdnZ0d27Zte3vv3r0VnHW8AUneLNUT6yzRNdOnT1cC0TET4vS7  27keBkwcaHfNgAEDho0fPz6lsrKyqK6uLgKy7cDMzMyX4Gc3+nKnNRpNSFRU1FUjRoyYOG7cuCSQ  Np3wdyfEx8cvh7891J3fefbs2a+2bNlynG2ilVgn5RMLdz0iug1QeqDsmOCufh49evS4uLi4S5Mn  T/638PDwa/2140BqFdQOA9PS0sbpdLrrYDPEnd/T2Nh45s0339wMWR03LwPJJe+yOEt0pS2Wg67E  FBecCdsM22fs2LEP9iINLM3NzSWQ+YtAa1fV19efBy1cZjQa648cOVI7Z86c4NTUVG1sbGwUSJPB  QNqrIUaq1erh8FXrq3+8o6Oj5Z8AZiWanXWj5AKlER1T2XJGeK/N4gFyd0K2PFtcXHwYMszxmpoa  HGXEwAGYDv592dnZwo9VBwcHn4Gv3/I3DXYRouYfx3nZEQON/6/Tp0/z8z1lbSUS0a3AkT+cqPGs  Fwhugax9ZNeuXT8cOHDgAisWy9wcQm+F+IZFCsTDEDM4F1cUsIfq6uqDmzZtymebWMzWKu2kK3Wd  v89Z9rzB3V9gMBj0O3bs2PzTTz9dYPq/yIvuRQm783wCsRRijLu/qK2trXbNmjX8VEOsUYqVeMKV  SnSUMDipGpd0cMmDhixuKigo+CInJ+cni1Xw6n3YH6KHeBwii7MO62td3FfL999/vwHuOihTcF8L  hVKKiK4MoMx4k2VOp9De3n7p66+/Xss8aJQaJ/3gQeNFuRUCLcE3OBf6afR6/Q4gOj8RpRT2tVGp  J1vpi4x+xVkXQuoVRqOx8uOPP36HkRz7Q476eaAFrcD5WEg6K60++uijH9gmSqsyJZ9oWk2X415l  ROgRLS0tFasBZ86caWIkzw+Qa4GDOwuwHnD0po6OjtbPPvvsH3AHwruBmUmWTiK6soHkec1BMVcH  xdyHlZWVrayYOx7gtQfxQnvCUYY+evTo5vz8/Hq2iUVyq9JPMhGd8bmHYs68Y8eO9efOnTOwYu6U  SGbF48W5tKf9bm5uFtqbZjq9RHQE+tR2OxsLCgq27d69u5yv7YDkBhHt9xlWTF+BzMzM2SEhIfy5  vcqPq5QR0UWMqZx1Ja9uaGpqOpuTk/Mz27ws0ilm6I/n2r4YGho6aO7cudezTWwfHkhEJ8y1I1ks  33zzzVbWF9LZW/EXQOC+vW5PngwdOlTYwqsjoisbqZydHvXa2to8waz4GpHPij8H8YWdrB4/Y8aM  VD6rB3jNeCJ6gPF7O9m8c9euXd8LMqYU/Oe/c3YWbRo+fLiwlTiOiE5E76bNDxw4wGfzBomscYIX  40HbF2NiYoYJNvsr+UQroQUAizHsBkwEzZ3S0dGRqlKpktRqtQ7iij6X4uJiYXEnpeWScTm5bk1q  uIzHG2+8saK1tbW2paXl4vnz52c1NzdX1NfXl+n1+vN5eXnYxYhjA0YpPpdIiUTH3vJEiGQkMwZ8  P5iROerX25da3RU9VnZQhH733XcnBLJFSjPjsZUBPf5g4Ys4WSQ8PDwZIy7uN/UyceJE7v77728R  XATVcr4IpER0LcvMSUDIJMzM+D0QNxGiv7NkdgQ44aVVVVX8KGKTxE4wSqyTENc5+wElXQRBIiQz  WmHJQGaUGYPxe0ZmfMZl18AHSA8uKMj7u15XV6cXbErx6Wu/uEJ0JV0EgSA63loTWGZOZpk5Gcir  g4MbxxfIviKzI+AcT8GmFJeA0Pvjj0jxIvAVkzAzJwnIPJjJDB0QOBaXfwsUmR2hsrKyRrApxYdT  nQ/0Doj1IvCEZX2YzEiC4i/ZbDZj8ce7GT6XGb5ASUmJ8AkPbRIkuqjnggbyIuiNgeF8ZkYyY2YW  WHP9hAWgVqvlpA6QLsIsLkWnQbLrmrt7EbCL28jC7IjofXkyA5G77DkBmZ225uQAthZhFyS6FqFR  jufF2YsALoAe7wRqQfZqAz1thDAA2ZsgGuD7Nk5BiI6O/vUOF6DHq3uKMCWdL5yoDpLZYDKZDPDV  CJw1Ms7ieIKFRSef0RtZFPagpVGi4LrfCZDxEzHrQ8ZPgOw+CGKAL1eX8jdiY2PDIKs3Ce52Ulvk  p4/MiGwBEl9ua2u7ZDQa6yCqIXNfaGpqqqyoqCjdu3cvjly3smj3tBitZ1EAtxC8jVzBD85qF8bD  VYWjkolA/nh2IcThU5ylcmBTUlL6FRUV8UQPkSDRJde4hSsG4+oKQGKMGiByNRC5AuqlikOHDpWD  DGlmRG6znfealZXl9Gq63iBhLYt8O3cENX8h4AUAkWRzIfxqNYoBCQkJSJRSgQxokhhvUsS2Q6AA  jJiRce4tEBm1NOroqkuXLpUfO3asrKSkpIHPyrZ1kTcXwPV1tsUdR2+6Bkh91E4xi7cHnP2igwsA  pRH67jo2eDSQOTt+uxBAusTbOE5Sw5BA6GQkMhSEdSwro7yoAglYAQVhGSsIeSJ3c0WmTJnit/0M  tKzAVaNwilplD65OMF8fwAFNAGnEXwgJggvBa4iJiUkVbEZJkOijfUBkp3Wy7RIg6Io8+OCDojgw  YtfPJiYlSnHgKTg42PbnqKNx0Coe7gY6vCPgNkojuBAG2WvDdVjJ9emTHB8fH8oauyLx6c0SauzC  QnR4IHSyFCD1Nl20krC/Q99DodyHFcq8Y4StvDg+wNcI3VwKrBduvvnm4evXr8eedBzZxRHeaokc  i8k9nU+x6GQiuu+AI4U4sbmohwsBn2s0spvIHTIkk/ttZv1ACRHd7rOUgNClzz333NtsE1uP8wKl  kwMJpU+l+8D2hYiIiCE33HDDIF6ng3yRgjeNkm2cvR+cOXPmR8FmhVJPtNKJfhjigI18UU2dOnUa  vwmRLIH/I9veuQTdXb9lyxY+g6M0qSWiKxevMRII3ZdREyZM4LN6nMizOjpFs+394OTJk9+AdOHX  Qz8v1WeJEtG9A1xybrVtUQpF2B3M7sSsnibSfcd9+297tRZq840bN/K1Bg58XVTySSaiW4EP79og  fCEyMjJt/vz5/HNEoyGrJ4hwv9Hbu8I7x4cAb9u2bYPZ3OWMdj2BjpaNJvAosH3hmmuumTVp0iSe  4LhYp5hGS/GBuovt/eDYsWObc3NzeT1eZOex7kR0hWIAkwDdD45arZ01a9ajQPhoztquMBzIrhXJ  /uKai3b3xcxSOUMnnV4iOq9zl3PWCShXIDg4ODo7O/sxnU6HTV4hjOyBHH/A0d6/clZL0S5Gjx59  V3p6Ov//XC2Si5OIHmDcB5Hp6A1hYWHxTwIyMjKw/yUCYmSAyIOdoB/1VhzjjJw5c+bcx4rpICZz  iOgKBlpzC515I65O+/DDDy+cPHky9tagVr8OyB7hZ02egxnamTdHRUVlQDE9gW32F2kxTUT3A7BD  7GXOhWd3arXa/rfddttTCxYsmAjZMpSR3dcEQml1B8Q6ztq34zSgtpgNMiZWUEyHKfVka+TStOMG  /p2zs5pur6xTqdRxcXHX3HjjjVe3t7eXAbQ7d+6MhjDAsfT2841SWdF5D+fGo9JhXzVpaWnJP/74  46GOjg68YCJhP6vldM7h/yGiOwAu2/Y8y5ZuAbJ7P8iYN4wZMybOZDI1lJeXI4nCIIxeIPxgiKc5  qxPk0dMqYD+jU1NTOw4dOqRnxXQn7F+D0oiuWrVqldJIjsP5m1yVAY6ADw9obGw8q9frc3fs2JFf  U1ODHY8YdS48khz3C1ttZ0Jc701ZCbvXsX379rf37NmDTV3YBnBUZA8ecxvOzhlVItFf4HroDfES  qSy4Km9dXV0xruV46dKlErgISrEXHLJqXXZ2dnBKSkpITExMP7PZjA8JGwISYyRo/mG+nEje2tpa  9corr6wyGAzoseNEijw59L74c3K0lDDFlyTnNXx4ePhgjOTk7o2Pc+bM6X7w/bhUH7pGUETf+tZb  b+HzjsKZPNIr5cQryXXB2ULPevILoKAzHD58+JOioqKv/b3zJSUlP+Tm5n4C++D2snOJiYmTb731  Vn5erA6yYZRSTr5SilEsOl+FSHf3F4AUOZaTk7Nm7969pUD2w9OmTSvWaDTjPSlonZVChYWF2997  773vjx8/XgWF7+fp6em4LEeSG3cbVVJSUlp+fv5B1r6LbtEF4IBk2wScLUaVIl2wy2+iu1n8yJEj  Wzdu3HiUs07WxiYpbHnFJjAs7l7hfLRCFuj6mm+//XbDrl27sJUYM3nh7NmzseX2Kc7qraMz45I3  jmMB8+fPz3rttdewIMexAFwi4wxldOkDhfJKzubZPq5mcc46O+ckkFy4qBG+voe5JNHedEnKy8t3  v/vuu5+cOnXqErugTsHfFq6FeQriO4jfcS4+GToiIkLXt2/f8oKCArxgI9gYgCQ7HCmjswsZ4iVX  s56DLG4PWNDh4iV/4qzWoEdoaGg4/cUXX2yFv48XFpK82EGbLWb6RznrVLrHXbmYMzMz7wHNv/Lc  uXNoM2LjVyP8HZNciSB3oj/CubjWCWZxIPgWvV5vYFm8yHZhHjtAWbGcs/rgke7uLBaay5cv/4ht  muHvnnDiY2gRrofYD/FnzslemKCgoMjs7Oy7XnrppXWctQ3ias5OTz65LuLHMEZ0lxyVFStWrAeS  1zOpUOAEyYWo9GSHcZ1vwaarUgJ19jxGeqf88X79+l07b968sWwzFrL6QCK6tIBS5WXOyf4QzOLv  v//+/zCpgmT7xYFU8RnRjUbjRQ+IjsCL8l2Ix5is6RUjRoy4Y9iwYXx9MQTIHkLSRTp4inNimQoX  tbjPid7U1FTnIdF5HIPA0alFzHHq0QLVaDShd999931Q9H5gsVj43vXjlNHFD+zBvtOPWdxrRK+v  r7/oJaLzn3+VXfQO13OJiooa+uijj/L2az859q7Ljeg40veiowzmJS3eE6o8+fCFCxeEhGz10jH5  mbO2+X7r6E3p6ekzx44dyz9IQHa963Ij+nOcdajfn1ncaxn99OnTF22cHG8BH93zLItGu0RQq7W3  3377/VqtVsVqm3Qgu0ouxJCTRp/FWZu2/KHFvU50tBbLysp4cpt9tFw1ZnVcou55JvG6AZ/6tmDB  gt+vXr0aB6L4pxWWUkYXD1BTLglQFudssrBbkxo8tBZdwUWm2/9i7++kpqbezObFIpL9PC+WiN7L  /4ADJX38qMUdodydD3nBWnQF2MS1hTkz+cIf4PS76dOnz42IiAhixzZdoo+ilB3Rcfh7VACzuFfk  ixetRVcvSmwheJdJui6w3vUZvKLhrL3rRPQAAj3fx0WQxT12XrxsLboCvoUAR1V/7WLE3vUZM2YI  e9f7EtEDA+zPwNHPrkamy5cvHwlgFvc4o/vIWnQFSPKHGOktOFNq2rRpd8fGxuLxRfclA8iukSpZ  pOy6PMlZe6nri4uL161evbrMx46KT4nuQ2vRFfAtBHux7tFoNIlLliy5aenSpV9x1rYKyfauSzWj  Z7JC6ofdu3c/xkgeyCzukXTxk7XoCvgWgq1arXbGypUrQ9n/NRCyen8iun+AWvGPEM/CQV+2ffv2  /gHS4l7L6H60Fl0B30LwdFBQ0B/g2OLyHSexMA3wIquKIfpYRnQc1MCuuxMiyOJC4CygOpcY5V9r  0VVgC8F/QIyB44wTQdCOlNykailq9F38N3DgxfrwKZz6FuPsm5uammpFTHQEtg38HzvmZlcvZMro  8oVL8qW+vl7sRJc8iOgiILoIrEUiOsEtuOS8iMRaJKITfJfRRWgtEtEJ3ie6SK1FIjrBOdnNOTkT  X+TWIhGd4BDYiuCU9SkBa5GITvBcvpC1SERXBNHJWiSiSx0VzryJrEUiuuwzOlmLRHRFEJ2sRSK6  HNDr6ChZi0R0OQD7tx0+epGsRSK6HNDByN4jyFokoitCvpC1SERXREFK1iIRXS7ocdUushaJ6IqQ  LmQtEtEVIV3IWiSiK4LoZC0S0eUEJLPdZ3eStUhElxNw8sUFu+K9qkooXchaJKLLU74UFhYKMzpZ  i0R0+RGdrEUiuhxxhcVI1iIRXY64YtCIrEUiuiIyOlmLRHRFaHSyFonocgSuPNvWLcWTtUhEV0JW  J2uRiC57nW6xWJrJWiSiyz6jm0ymC6TPieiyJ7rZbK4gohPRlSBdyojoRHS54tdBo87OzvNEdCK6  7KWLWq0+J3idrEUiuqzQwDEbMSIiQo9Snb1O1iIRXZZZvZEFZnKyFv2IIDoEfiU6L1VwpNRCh4SI  Lkeg89Is0OYddEiI6HLN6A0CopNsIaLLluihAqJr6JAQ0eUIHBHVEtGJ6ErI6GpBMUrwI/5fgAEA  9BnasNkcSoMAAAAASUVORK5CYII=',
			rotateIndicatorPointer:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAADxCAYAAACEXZTsAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6OTQ0RjM2N0YyNDJFMTFFMjk1QkFBRDIwRTU4OTdBRDgiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6OTQ0RjM2ODAyNDJFMTFFMjk1QkFBRDIwRTU4OTdBRDgiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5NDRGMzY3RDI0MkUxMUUyOTVC  QUFEMjBFNTg5N0FEOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5NDRGMzY3RTI0MkUxMUUy  OTVCQUFEMjBFNTg5N0FEOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/Psfyr6YAAArZSURBVHja3J1bbyNJFcfL7cT25D6Jc2Em  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',

			arrowTop:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAdCAYAAADsMO9vAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6QjNFMkVGMDEyQzI0MTFFMjg3QzRFMzA4RUMzNUU1M0UiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6QjNFMkVGMDIyQzI0MTFFMjg3QzRFMzA4RUMzNUU1M0UiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpCM0UyRUVGRjJDMjQxMUUyODdD  NEUzMDhFQzM1RTUzRSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpCM0UyRUYwMDJDMjQxMUUy  ODdDNEUzMDhFQzM1RTUzRSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlvCjVAAAAD/SURBVHja1JjRDYQgDIbZgBEYwREcgREY  xREcoSMxwo3gCHc+0MQQPCgUKCT/G8r3GW0RpfoNfceHaLXYQPhvyFISJoJ/Shjp8NudKwGPucKc  JeFFS9hC+KeElQLvCOBx3Mrw0yVOBnjMORoeGOExIBEeKuYP664UGIpEl67dAj9dwjDA10o0bz1K  uyulmlCqV1PXpsK7Tv2jSsJ2hK+VsD1u3NpJ2dcaCc++JvXj2hnL9N5aLGBUZWAsGiAJvknCC4Gv  kfC4Tchd8Bn8G7iFNXMPVJdYzzoS+bf/Sr4NThB8TuK1lB4CD6NiiaPkh0XaSRpKQOlkiceASa6f  AAMADgHRdvHjSZ0AAAAASUVORK5CYII=',
			arrowBottom:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAdCAYAAADsMO9vAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6Qzg4RUFEREQyQzI0MTFFMkJGRTVENTM1RUFERUEyNjMiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6Qzg4RUFEREUyQzI0MTFFMkJGRTVENTM1RUFERUEyNjMiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDODhFQUREQjJDMjQxMUUyQkZF  NUQ1MzVFQURFQTI2MyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDODhFQUREQzJDMjQxMUUy  QkZFNUQ1MzVFQURFQTI2MyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pl7tKzkAAAEVSURBVHja1JjREYQgDES5CizhSqAES7gS  UoolUAIlUcKVQAmRD5hhPBXDkRgzk79V3uK4Roz5LZ86pJ6Mnpoyk28Jl9SYW4uJAl+4liMhVCIt  JrbwpWErtKnjjvBOE0fwmFltLTyCL/2tLxAom9c8Y4plY0NDuOuaGT5eZAoldVCJCQo81qmkwUQ3  fClHNDEPhJ+J8I4SpWcNA+CHrylpgm2tD/GRAjN8zEysLxUwwlupZHAX7umkE+9N+NhhY2KkxHXI  a7PPJVdNUOGHz1//mLgdvncnfYdepDwxv1XB96TJiPRiKRgAD+bmgifD944eXaOBlj8pqT87FhOq  4Vujx9DRQPpIRNtJH8kEK/wLEc2TaxVgABhX1Dief8wFAAAAAElFTkSuQmCC',
			arrowLeft:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAwCAYAAADtoXHnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6NTkwNjJDNTkyQzI0MTFFMkI0NzZFM0NEMTRCQUU4NzAiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6NTkwNjJDNUEyQzI0MTFFMkI0NzZFM0NEMTRCQUU4NzAiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OTA2MkM1NzJDMjQxMUUyQjQ3  NkUzQ0QxNEJBRTg3MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OTA2MkM1ODJDMjQxMUUy  QjQ3NkUzQ0QxNEJBRTg3MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ps3mm0sAAAEHSURBVHjaxNhhDcMgEIZhMgOVMAmVMAmV  gJRJQAKSJmESJoHRhSVkNIM7oC/J/WrSJ2nhA86EEMyk4WM9Yi3Fk0noDoZUr1jrbNRlYA7bWag9  APO6j0Zr4Lf8KHRrBMNncg1A1/TP2sB9NneicrDzn15VYAe6pBe1gM8iIBSoBCyDQYn2gQrUd4NC  dAwoQJ1g8d+qb2tArQC0Td+sgo4HK+g2BfyDSuLNiqPlAJWAThWgP6gkT716m8hQSbzpwQw9D8zQ  88A4LoYY5OdFJhK2ZLBwwGIQC3xsa8M2cey4gh3MsCModtjGrhXIBQq7KmKXYuz6jzU6sJYO1rzC  2nRYQ7Laen0LMACbElNZVX4epQAAAABJRU5ErkJggg==',
			arrowRight:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAwCAYAAADtoXHnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0  NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl  SUQ9InhtcC5paWQ6N0M5MkUyMEIyQzI0MTFFMkJEREE4MzFDNDE2ODE0OTAiIHhtcE1NOkRvY3Vt  ZW50SUQ9InhtcC5kaWQ6N0M5MkUyMEMyQzI0MTFFMkJEREE4MzFDNDE2ODE0OTAiPiA8eG1wTU06  RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3QzkyRTIwOTJDMjQxMUUyQkRE  QTgzMUM0MTY4MTQ5MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3QzkyRTIwQTJDMjQxMUUy  QkREQTgzMUM0MTY4MTQ5MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1w  bWV0YT4gPD94cGFja2V0IGVuZD0iciI/PrqtTzoAAADVSURBVHja5NjhCYMwEAXgows4giN0BEdw  hBvFETpCRsoIjuAINsIJpfgjoZf3YhN4/4QPgj6TE7leQ0pMCQJaz5QtZbdUh/ULPPOqBS4X2GfU  ExtsC/eMqCcaM9EjMwPe7GXrCx494TUTjvZ8lYJoFhYGHP4CngrKw7WntQDW7uCZAbvWpdgLQ4ED  o6dLYNe6vAf8kBsv+PY2C7p9MvBy0FZBt8KH/9rgIPy4Aj+YNQ1GBvhzvcEvUPCrIvxSTLmFwwcd  lJEOZXhFHdPRBpKQ0etbgAEA5TXHBKbv1IkAAAAASUVORK5CYII=',


		};

		//分享api；有需求的照着添加
		//api项，请返回给一个{url:url,wSize:{w:,h:}}，脚本会自动调用window.open打开，如果不返回任何的话，脚本将不做任何其他事情。
		//api的参数
/* 		{
			title
			pic
			url
		} */
		prefs.share={
			weibo:{
				disabled:false,
				name:'新浪微博',
				icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAACfklEQVQ4ja2ST2iTBxjGf++Xr0va2qqt02ntEkxo025DqUpjdeAOdj0YxIPgxYOKePHmwag77bDL0IlMKgoeeqgIQrapSOtFpFOc4GWb1n+kNqLWKNqmSZs03/fs4CplXjbcc3oP7/vjfZ/3gQ+U/dvGZ0f5POjSBeSGn3Ol6zsm/xNg4gQ/SGwyY5mEB+ycv4+L7wF+Wh4Org5VbwfWApeaHw5fBrhxCOezJrqAx8AuIFWu0OnOHR6Jtn4VMDsjKWxmJqkHiAFUnlQ3acn0cQJaAWw2Y01VgP3vNsjG4ruBk8Bc6J/AMeBrHC10GkqnardmI848byXwK7DXBRiNtm4DTkkyM0N/F5Lazey0JJlv5uWCi7yXwZTVFktmLJCYtNuRWPhj1/0dqLN5tdQkNxPs7CTwyRI0NUX5zh2K59NUMhmAa07jdLLp5sjEi2Os+cil3rKx+GlJu0Pru6zhyPfKuwHr7+9XLpezZDKpjo4O08yMXh/6xgrpn2Vmr3xpS/jRveuzt798umGjvEJBY2NjikQiAuQ4jlzX1dDQkCTJy08q2/aFsrG4srH41VmTHKAuuH6dnJoa+vr61NzcTG9vr3p6eqhUKhoYGHjrSSiIVVUJQFJ5LmBg5u6wyfdpbGy0RCJBPB63wcFBHMex7u5uzMwKZ8+hYtEAX3Dk3Z9+i0SbRqOt914dPKzym3E/lUqppaXFTyQSSqfTvlcoavz4j362pV2j0dZSNhbfMzc7BnBhebhuVaj6gNXX7wl9uWGxG/4UfJ9KZoTp6zdQPl8Cfsl73rftmQd/vAeY1dHFSwMrg6FVDYFAG1ALVMpS5n65dGvHsyf5f8b+f9FfksATEF5LDZgAAAAASUVORK5CYII=',
				api:function(args){
					var url='http://service.weibo.com/share/share.php?'+
						'title='+args.title+
						'&url='+args.url+
						'&pic='+args.pic;
					return {
						url:url,
						wSize:{
							h:500,
							w:620,
						},
					};
				},
			},
			t:{
				name:'腾讯微博',
				icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAADL0lEQVQ4jXWTS2hcVQCGv3PuuffOTJJxEslkNElRm5hoRZOKjyKKSEWwqNWFWLsQqRbc1UfVLLoRXbgqiCh0IYoPaCnWWqlQN6mpIPXRaqkk9ZGOJS+SmQzjZO7j3HOOi4jFhR/8m3/5/3xC+H4YPLhzX//9j+zq6S1XfClBAI7/8k+nrWV1aXFubvLLT5JjH+xTwUNPvbHx8WdefPaW6+j0PSwObRyZsWhr0NaROkdqITaOyBhWK339Ybl/7+8gxYa3Plt9YeuW0om5OlFmcc4yWAjYNdLH7b1d5D1JtZVwtFrjSLWOEAIpBT6CXy78WleFru6SdNBopTgc2wa7eWlsgKmFJm/+eImldsqNPQV2DJW5u6/IxLeztBJLIiAf5PLKGEsr1cRxwmh3gYnNg7x2epbPZ2v/TnF6ocHB6UX23zPMxPgAz0/9hhCCzDohE21oRpp2onn6hgpfVescnF4kSzQ7h8u8Oj7AplKe2lrC3skZ7qhcwWBe0Y5SkkxIqbWhESVEUcLm3iKHp+eJ4pQnR/rYMz7IY0Nl3rlvlNBZLjbW+G6hwdiVnURxSpZlQqba0mglxLGmK/BYaETE7ZThYoix6w92+B7lUBHHmno7xXOOONboDCnraynzzTYrrYiZWotrijmaUcJwTxepMXhSMvVnnZN/LLPSjNhYKjC9/Be1VkQ91kI561htJxjj+PjnSxhreP3eUU5WV3jgwxn6i3l+mG+AEDx8fYWru3Icn1nAGAfOCiU8wZo2eL7i7e8v0tcR8MpdI4wdmKSVGZaXW3i+x45NA7y77WZ2f/ETLevwlMQ4nBICIuNQykM7x547hzhwtoq2jo+234on4barShRDn+eOn+PTC0soXwHg0tQpqQSpBBUosJat1/byxLGzdHaGnKiuUAwV75+f48xSk2ZqUDl/XQ0HRidWSavbTnoFP/DIedCT96mupeApjszWLoslPPycd1ky55Btk0h37tQhbTNyoWJDqYOltqazEFDI++TyAUHoE+Z8wlARBoowVHi+xDiDO//NYYEf5PxHd++XN23ZLrpKFZwDIdbzP7hmbc6c+fpQdvS9l/8GEfOFXVv7AEQAAAAASUVORK5CYII=',
				api:function(args){
					var url='http://v.t.qq.com/share/share.php?'+
					'title='+args.title+
					'&url='+args.url+
					'&pic='+args.pic;
					return {
						url:url,
						wSize:{
							h:500,
							w:620,
						},
					};
				},
			},
			qZone:{
				name:'QQ空间',
				icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAACD0lEQVQ4jbWQvWsTcRyHn7vf5bVJ2kaSplXQKL5QUUPzBzhUXBQcFRw6CAFBpzooFKRQkCIBxa3SoSCoOHXIInQSFBELRShC1b7Q1qTBNJdLTO5ydz8H29BgDTj42b7wfR4+fOB/xsjFs0Yunu30o3SAo8Dqznk4fGmrtN+f2kF+S0TCIREJh4Cb/9TAyMUDwKrnYCIGkuZGobjTot5RoM/GzgAx4KrWHcp4+k8jrXXsHzq2Xp0CXgLF7ivFTy1B4dWAqyAdQEP97VNUlej5xzjlHLI2D0B1pYS0baQEXBegAawpxecHksBc8OSFpLfvLGrgFLVnT7EWPlCtOViWxGpIjk8ebTU1t3TMrcoyMKwA5GeiCWDOn4gMBgZ6ABDx66CqfB4Zb4Prm2Ua+coiMJwYKeVbG6xP9USB18GB7vSu5OvYMscmkm3wz039I3DxUKZc+mPElSeRhOoR3/suT7KUuYPXr+DzKXQFBSIVwvBUcJtO/5Hblfwuo+0V2Kab1IQHM/+GEzOzALhmEdncpr70CPdLFdtsJoG/CWRKBAX1tffUvr3F3K4B4OvtQtUEEoFtyhTwbn+B5aa9rsBYK9PYNqrAQ8Cpbup3/b3hkKoJbMtN72XaBI7lpoyNkgNMA/fPPTDzAAv3fNO1gj4O3ABSe5nWiPOjXi/wAhgbylqL7JP5Ue8gMAFcG8paFsAvetnTGCl2Yn0AAAAASUVORK5CYII=',
				api:function(args){
					var url='http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?'+
						'title='+args.title+
						'&pics='+args.pic+
						'&url='+args.url;
						return {
							url:url,
							wSize:{
								h:650,
								w:620,
							},
						};
				},
			},
			fanfou:{
				name:'饭否',
				icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAABb0lEQVQ4jaWTXy4DURTGf9OOCkljTBNCiEksgB3oEliBLmF2oHYwVmC6Auyg3psYPJGIIqm0aXVkpI3SHA/HmDKtB77k5px7c+53/hvrlyLdIX/CfBbM1jtEnwS+A34HqlHa2MpCMa8HwH2ANwFzykgMdgvJ581Z8FbAMmFj5jtZpaNyygDDDkSe3qFUgEMn7bnyGVF9AEEPwpF0bRPM+OIuqjyNYCsPz0OYy05OKWEJRIpXIiIiXlOkdKu635aJKDdEqInYgUgmzr/Sgc0ZTeU0Us8x7gaw/6jnJzIAxyGU6hp69QWK14nBeV9luQFeU/Wg94PgN/htWMuBk4Nt6w8EXksLWl7WQp/3tSMxzHGfSoXEW0yyt6T6zs132xSBu6DtAzgJVdZfJ0c4NoWDlspqBN6qDthJqOEfrevbF+xAe0pNZ8C5SM9A3HfrTOS4q2/uvc6BkT8TicZso5MDZ1rDHy0aaH2qEQwB47/r/AEuq9/lRZUysAAAAABJRU5ErkJggg==',
				api:function(args){
					var url='http://fanfou.com/sharer/image?'+
					'u='+args.url+
					'&t='+args.title+
					'&img_src='+args.pic;
					return{
						url:url,
						wSize:{
							h:550,
							w:650,
						},
					};
				},
			},
			tieba:{
				name:'百度贴吧',
				icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAAB6ElEQVQ4jaWTy2sTURTGfzOdSbFNpQRbX1DjYyPFlYyuogtFEcFtBSldFhc1IMFFQYpd+CjYhW4UXAkiRPSPUEEqiNKmPhKSSUIbzYM0bRaZV3JchMRE46b9Nvdwzz0/Pu53rxIyTGEH0gDefgxua/jMqTRqr0YibnNvvkhsxQLATDmYKacnpCfg2ZNNXj6v8vB+GTPlMHU1R/h6viekC1DZqLfr4UCzVSo29xxX2nWntFaRzbjMzRbx+1UeP93H4kKJi5eGGD/RTzgSoPPc2CH9DyFkmCIiEn1RkWMHEhIyTIktWyIiUqvVpaVU0pbJiTWZnFiTTNoREZGQYUrbQfCoj/0HNfaOamTSLgODCosPyvTpEL4Z4HW0yreYQ2WjTv6X13bRBhindxGOBCjkPY6P+5iZzpOM2+i6SrlU587dEZbe1yCos2ek7987ALh8xc/PnMetGwV+fLUBsKwGH97VmI0UWHg0SjbtcviIr3cKyYTLzHSeL5+b+XseaFpzXV1xmL9dYiyod450A95Et1hdtvG8v6LSoLrV4NOSRTbt9o4RQNPBthooqoLjgDQEG1BUBYBarUFu3fs/4NrUMLn1OvHvDruHVM6eH2g6e1WlutngpNHPuQuD3fZa72A7ChmmKDv9zr8BrHscNfGR3bQAAAAASUVORK5CYII=',
				api:function(args){
					var url = 'http://tieba.baidu.com/photo/shenqi?'+
					'title='+args.title+
					'&src='+args.url+
					'&pic[0]='+args.pic;
					return {
						url:url,
						wSize:{
							h:500,
							w:750,
						},
					};
				},
			},
			renren:{
				name:'人人网',
				icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAAC10lEQVQ4jXWTTWhUVxTHf/M+nSTjTCax+dAkxk5lGo2ttMUGBJt0FEFUsJa0i0JXQpFu7KLFgIsKUgpdlRYMFApZKtRNrYkLKYUKFiWQtgq1nUAmkGgMiZN5M++9e+/pIvURIv3DWdxz7v93uPdwUmySndk56O04esbJFYec3EuviY4jXZ2dUU+mbzbmfhqX+mJ5s2ddKcv2d42O5Y5cC/3PZ2T8VkVERMJYy/itimy5MC3Zw1eq3o6jZzbaHICU7aVbXr84pYffPvi02IZZ1ZhmGwDPsTDNNo32DPHp/S3+3xcvOzdfPRxMf/keYrQFkB44+616a+RgUGjDPAphvkZlNU66VFZjmF9DVzVBcRuU3jnt7xodA7DsXHHI3n/yw3p3HuYCWIogUDSUSQANZaCm4HEIcwGNrizpF0fHrPS2XsfvOfZR2L0VlgKoKxDAGCIjCSAyAsaA0lA1GGMIX+7y3IcjH1hO274RZblQ06AADSihVMgmgFIhC0qSGlVF7Pu4L7xxzLL81k4TGVAGjIAROtsdju9uTQDHd7fS2e4kdZRBa7CbuwpWynZsQgXarEeoKR3IPzfl0oE8hHrDPQWApYPH81ao/iMLfdtdJk70PQeYONFH33Z3/QlGsBsxOlgsW3p55menFoISero97pwbSEznr89y/vpscr5zboCebg+U4K41iB/99iN2rjiUOTkpg1/fl4VaJM+0UI0kf2pS8qcmZaG6IV+LZM9Xv0vuyLUwle7ot/TKg9v6n6mJfWFER5ObdBu+dI/lMMVymGL40r0k39HksjeOaZSvfCH1xbINoJ7cvVFe6T306/yW3j39Gd789DYPH6xBtgl8h6XyU77/pcIrOzOc/eYPpn64erX+5+WPQSSVoFOW7fe/+1m68P6FuuV5qiWNTnsA2EGEW6vj69pa/f53n0SVG+OJbfNvP1tnN7/3kL21fxBArfx19//W+V9oRmy7yi+Z7gAAAABJRU5ErkJggg==',
				api:function(args){
					var url='http://widget.renren.com/dialog/share?'+
					'link='+args.url+
					'&title='+args.title+
					'&pic='+args.pic;
					return {
						url:url,
						wSize:{
							h:600,
							w:650,
						},
					};
				},
			},
		};


		//获取位置
		function getTargetPosition(target){
			var target=target;
			var rect=target.getBoundingClientRect();
			var compStyle=getComputedStyle(target,null);
			var pFloat=parseFloat;
			var t=rect.top + pFloat(compStyle.paddingTop) + pFloat(compStyle.borderTopWidth);
			var l=rect.left + pFloat(compStyle.paddingLeft) + pFloat(compStyle.borderLeftWidth);
			var r=rect.right - pFloat(compStyle.paddingRight) - pFloat(compStyle.borderRightWidth);
			var b=rect.bottom - pFloat(compStyle.paddingBottom) - pFloat(compStyle.borderBottomWidth);
			var scrollXY={
				x:window.scrollX,
				y:window.scrollY,
			};
			return {
				w:r-l,
				h:b-t,
				t:t,
				l:l,
				r:r,
				b:b,
				top: t + scrollXY.y,
				left: l + scrollXY.x,
				right: r + scrollXY.x,
				bottom: b + scrollXY.y,
			};
		};

		//获取窗口大小.
		function getWindowSize(){
			return {
				h:window.innerHeight,
				w:window.innerWidth,
			};
			/*
			var de=document.documentElement;
			return {
				h:document.compatMode=='BackCompat'? document.body.clientHeight : de.clientHeight,
				w:de.clientWidth,
			};
			*/
		};


		function getCurrentSize(target){//获取页面上显示的图片的宽 高.
			var iCS=getComputedStyle(target,null);
			return {
				h:parseFloat(iCS.height),
				w:parseFloat(iCS.width),
			};
		};


		//xpath 获取单个元素
		function getElementByXpath(xpath,contextNode,doc){
			doc=doc || document;
			contextNode=contextNode || doc;
			return doc.evaluate(xpath,contextNode,null,9,null).singleNodeValue;
		};


		//事件支持检测.
		function eventSupported( eventName,el ){
			el = el || document.createElement("div");
			eventName = "on" + eventName;
			var isSupported = (eventName in el);
			if (!isSupported && el.setAttribute) {
				el.setAttribute(eventName, "return;");
				isSupported = typeof el[eventName] == "function";
			};
			return isSupported;
		};


		//检测属性支持.
		function attrSupported(proName,el){
			el = el || document.createElement("div");
			var isSupported = (proName in el);
			return isSupported;
		};

		//css属性支持
		function cssProSupported(proName,elem){
			var prefix=['','-webkit-','-o-','-moz-','-ms-'];
			elem=elem || document.createElement('div');
			var style=elem.style;
			var camelPro;
			for(var i=0,ii=prefix.length;i<ii;i++){
				camelPro=(prefix[i]+proName).replace(/-([a-z])/g,function(a,b){
					return b.toUpperCase();
				});
				if(camelPro in style){
					return camelPro;
				};
			};
		};

		//css属性值支持
		function cssValueSupported(proName,value,elem){
			var prefix=['','-webkit-','-o-','-moz-','-ms-'];
			elem=elem || document.createElement('div');
			var style=elem.style;
			var prefixedValue;
			for(var i=0,ii=prefix.length;i<ii;i++){
				prefixedValue=prefix[i] + value;
				style[proName]=prefixedValue;
				if(style[proName]==prefixedValue){
					return prefixedValue;
				};
			};
		};

		//抛出错误到错误控制台
		function throwErrorInfo(err){
			if(console && console.error){
				console.error(err.message + '\n\n' + (err.stacktrace? err.stacktrace : '') + '\n\n' , err);
			};
		};

		//对象克隆
		function cloneObject(obj,deep){
			var obj_i;
			var ret=Array.isArray(obj)? [] : {};
			for(var i in obj){
				if(!obj.hasOwnProperty(i))continue;
				obj_i=obj[i];
				if(!deep || typeof obj_i!='object' || obj_i===null || obj_i.nodeType){
					ret[i]=obj_i;
				}else{
					ret[i]=cloneObject(obj_i,deep);
				};
			};
			return ret;
		};

		//闪烁元素。
		function flashEle(ele,duration){
			if(ele.dataset['pvFlashing'])return;
			if(ele.offsetHeight==0)return;
			ele.setAttribute('data-pv-flashing','true');

			var oOutline=ele.style.outline;
			var oOutlineOffset=ele.style.outlineOffset;
			var oOpacity=ele.style.opacity;
			var oTransform=ele.style[support.cssTransform];

			var count=0;
			var startTime=Date.now();
			duration=duration? duration : 1200;

			var flashInterval=setInterval(function(){
				var outline='none',
					outlineOffset=0,
					opacity=0.3,
					transform='';

				if(count % 2 == 0){
					outline='5px dashed rgba(255,0,0,0.95)';
					opacity=0.95;
					outlineOffset='1px';
					transform='scale(1.1)';
				}else{
					if((Date.now() - startTime) > duration){
						clearInterval(flashInterval);
						outline=oOutline;
						opacity=oOpacity;
						outlineOffset=oOutlineOffset;
						transform=oTransform;
						ele.removeAttribute('data-pv-flashing');
					};
				};

				ele.style.outline=outline;
				ele.style.outlineOffset=outlineOffset;
				ele.style.opacity=opacity;
				ele.style[support.cssTransform]=transform;

				count++;
			},80);
		};
	
		//支持情况.
		var support={
			cssTransform:cssProSupported('transform'),
			cssCursorValue:{
				zoomIn:cssValueSupported('cursor','zoom-in'),
				zoomOut:cssValueSupported('cursor','zoom-out'),
			},
			requestFullscreen:(function(){
				var array=['webkitRequestFullScreen','mozRequestFullScreen','requestFullscreen'];
				var tempEle=document.body;
				var ret;
				for(var i=array.length-1;i>=0;i--){
					ret=array[i];
					if(ret in tempEle){
						return ret;
					};
				};
			})(),
		};


		//console.log('浏览器的一些对象支持情况:',support);

		//imgReady
		var imgReady=(function(){
			var iRInterval,
				iRReadyFn=[],
				isrcs=[]
			;

			var timeLimit=3 * 60 * 1000;//3分钟

			function checkReady(){
				var now= Date.now();
				for(var i=0,ii=iRReadyFn.length,iRReadyFn_i;i<ii;i++){
					iRReadyFn_i=iRReadyFn[i];
					//now - iRReadyFn_i.startTime >= timeLimit || 
					if(iRReadyFn_i()){
						iRReadyFn.splice(i,1);
						isrcs.splice(i,1);
						i--;
						ii--;
					};
				};
				//console.log('checkReady',iRReadyFn.length)
				if(iRReadyFn.length==0){
					clearInterval(iRInterval);
					iRInterval=null;
				};
			};



			var imgReady=function(img,opts){

				if(/NodeList|HTMLCollection/.test(Object.prototype.toString.call(img))  || Array.isArray(img)){
					arrayFn.forEach.call(img,function(img,index,array){
						if(img instanceof HTMLImageElement){
							imgReady(img,opts);
						};
					});
					return;
				};

				if(!(img instanceof HTMLImageElement)){
					var t_img=new Image();
					t_img.src=img;
					img=t_img;
					t_img=null;
				};

				var ready,load,error,loadEnd,abort,timeout,time;
				ready=opts.ready;
				load=opts.load;
				error=opts.error;
				loadEnd=opts.loadEnd;
				abort=opts.abort;
				timeout=opts.timeout;
				time=typeof opts.time=='number'? opts.time : 0;

				if(time){
					setTimeout(function(){
						if(!loadEndDone){
							aborted=true;
							removeListener();
							img.src='data:';
							if(timeout){
								timeout.call(img,{
									target:img,
									type:'timeout',
								});
							};
							loadEndDone=true;
							if(loadEnd){
								loadEnd.call(img,{
									target:img,
									type:'timeout',
								});
							};
							
						};
					},time);
				};

				var src=img.src;
				var loadEndDone;

				function go(type,e){
					switch(type){
						case 'load':{
							removeListener();
							go('ready');//如果直接触发load，那么先触发ready
							if(load){
								load.call(img,e);
							};

							if(!loadEndDone){
								loadEndDone=true;
								if(loadEnd){
									loadEnd.call(img,e);
								};
							};
						}break;
						case 'ready':{
							if(!ready || readyHandler.done)return;
							readyHandler.done=true;
							ready.call(img,{
								target:img,
								type:'ready',
							});
						}break;
						case 'error':{
							removeListener();
							if(error){
								error.call(img,e);
							};
							if(!loadEndDone){
								loadEndDone=true;
								if(loadEnd){
									loadEnd.call(img,e);
								};
							};
						}break;
					};
				};

				var aborted;
				var ret={
					img:img,
					abort:function(){
						if(!loadEndDone){
							aborted=true;
							removeListener();
							img.src='data:';
							if(abort){
								abort.call(img,{
									target:img,
									type:'abort',
								});
							};
							loadEndDone=true;
							if(loadEnd){
								loadEnd.call(img,{
									target:img,
									type:'abort',
								});
							};
						};
					},
				};

				function readyHandler(){//尽快的检测图片大小.
					if(loadEndDone || aborted)return true;
					if(img.naturalWidth==0 || img.naturalHeight==0)return;
					go('ready');
					return true;
				};


				function loadHandler(e){
					go('load',e);
				};

				function errorHandler(e){
					go('error',e);
				};

				function removeListener(){
					img.removeEventListener('load',loadHandler,true);
					img.removeEventListener('error',errorHandler,true);
				};

				//ready必须在load之前触发。

				if(img.complete){//图片已经加载完成.
					if(typeof img.width=='number' && img.width && img.height){//图片
						setTimeout(function(){
							if(aborted)return;
							go('load',{
								type:'load',
								target:img,
							});
						},0);
					}else{//这不是图片.opera会识别错误.
						setTimeout(function(){
							if(aborted)return;
							go('error',{
								type:'error',
								target:img,
							});
						},0);
					};
					return ret;
				};


				img.addEventListener('load',loadHandler,true);
				img.addEventListener('error',errorHandler,true);


				if(ready){
					var index=isrcs.indexOf(src);
					if(index==-1){
						isrcs.push(src);
						readyHandler.startTime= Date.now();
						iRReadyFn.push(readyHandler);
					}else{
						iRReadyFn[index].startTime= Date.now();
					};

					if(!iRInterval){
						iRInterval=setInterval(checkReady,66);
					};
				};

				return ret;
			};

			return imgReady;
		})();


		var addWheelEvent=(function(){
			var eventName;

			if('onwheel' in document){//w3c FF>=17 ie>=9
				eventName='wheel';
			}else if('onmousewheel' in document){//ie
				eventName='mousewheel';
			}else{// < FF17
				eventName='DOMMouseScroll';
			};

			return function(ele,callback,useCapture){
				ele.addEventListener(eventName,function(e){
					var type=e.type;
					var ne;
					if(type!='wheel'){
						ne={};
						for(var i in e){
							ne[i]=e[i];
						};

						ne.type='wheel';
						ne.deltaX=0;
						ne.deltaY=0;
						ne.deltaZ=0;
						ne.deltaMode=1;//line
						ne.preventDefault=e.preventDefault.bind(e);
						ne.stopPropagation=e.stopPropagation.bind(e);

						if((typeof e.axis=='number' && e.axis==2) || (typeof e.wheelDeltaY=='number' && e.wheelDeltaY!=0)){//Y轴的滚动
							ne.deltaY = e.wheelDeltaY? -e.wheelDeltaY/40 : e.detail;
						}else if((typeof e.axis=='number' && e.axis==1) || (typeof e.wheelDeltaX=='number' && e.wheelDeltaX!=0)){
							ne.deltaX = e.wheelDeltaX? -e.wheelDeltaX/40 : e.detail;
						}else{
							//z-轴，mousewheel和DOMMouseScroll都不支持
						};
					};

					callback.call(this,ne? ne : e);
				},useCapture || false);
			};
		})();


		var addCusMouseEvent=(function(){
			var tele= document.documentElement || document.createElement('div');

			var support={
				mouseleave:'onmouseleave' in tele,
				mouseenter:'onmouseenter' in tele,
			}; 

			tele=null;

			var map={
				'mouseleave':'mouseout',
				'mouseenter':'mouseover',
			};

			return function(type, ele, fn){//事件类型，元素，监听函数
				type=type.toLowerCase();
				if(support[type]){
					ele.addEventListener(type,fn,false);//mouseleave,enter不冒泡
				}else{
					ele.addEventListener(map[type],function(e){
						var relatedTarget=e.relatedTarget;//mouseout，去往的元素；mouseover，来自的元素
						if(!this.contains(relatedTarget)){
							fn.call(this,e);
						};
					},true);
				};
			};

		})();



		//库
		function GalleryC(){
			this.init();
		};


		var gallery;
		var galleryMode;
		GalleryC.prototype={
			init:function(){
				this.addStyle();
				var container=document.createElement('span');

				this.gallery=container;
				container.className='pv-gallery-container';
				container.tabIndex=1;//为了获取焦点，来截获键盘事件
				container.innerHTML=
					'<span class="pv-gallery-head">'+
						'<span class="pv-gallery-head-float-left">'+
							
						'</span>'+

						'<span title="弹出照片进行复杂操作" class="pv-gallery-head-command pv-gallery-head-command-operate">折腾<span class="pv-gallery-vertical-align-helper"></span></span>'+

						'<span class="pv-gallery-head-command-container">'+
							'<span title="选择图片类别" class="pv-gallery-head-command pv-gallery-head-command-category">类别<span class="pv-gallery-vertical-align-helper"></span></span>'+
							'<span class="pv-gallery-head-command-drop-list pv-gallery-head-command-drop-list-category">'+
							'</span>'+
						'</span>'+

						'<span class="pv-gallery-head-command-container">'+
							'<span title="一些命令菜单" class="pv-gallery-head-command pv-gallery-head-command-others">命令<span class="pv-gallery-vertical-align-helper"></span></span>'+
							'<span class="pv-gallery-head-command-drop-list pv-gallery-head-command-drop-list-others">'+
								'<span class="pv-gallery-head-command-drop-list-item" data-command="openInNewWindow" title="新窗口打开图片">新窗口打开</span>'+
								'<span class="pv-gallery-head-command-drop-list-item" data-command="scrollIntoView" title="滚动到当前图片所在的位置">定位到图片</span>'+
							'</span>'+
						'</span>'+

						'<span class="pv-gallery-head-command-container">'+
							'<span title="分享" class="pv-gallery-head-command pv-gallery-head-command-share">分享<span class="pv-gallery-vertical-align-helper"></span></span>'+
							'<span class="pv-gallery-head-command-drop-list pv-gallery-head-command-drop-list-share">'+
							'</span>'+
						'</span>'+

						'<span title="关闭库" class="pv-gallery-head-command pv-gallery-head-command-close"><span class="pv-gallery-vertical-align-helper"></span></span>'+

					'</span>'+

					'<span class="pv-gallery-body">'+

						'<span class="pv-gallery-img-container">'+
							'<span class="pv-gallery-img-container-left-side">'+
								'<span class="pv-gallery-img-controler pv-gallery-img-controler-pre"></span>'+
							'</span>'+
							'<span class="pv-gallery-img-content">'+
								'<span class="pv-gallery-img-parent"><!--图片放在这个里面--></span>'+
								'<span class="pv-gallery-vertical-align-helper"></span>'+
							'</span>'+
							'<span class="pv-gallery-img-container-right-side">'+
								'<span class="pv-gallery-scrollbar-v pv-gallery-img-scrollbar-v">'+
									'<span class="pv-gallery-scrollbar-v-track pv-gallery-img-scrollbar-v-track">'+
										'<span class="pv-gallery-scrollbar-v-handle pv-gallery-img-scrollbar-v-handle"></span>'+
									'</span>'+
								'</span>'+
								'<span class=" pv-gallery-img-controler pv-gallery-img-controler-next"></span>'+
							'</span>'+
							'<span class="pv-gallery-img-container-bottom-side">'+
								'<span class="pv-gallery-scrollbar-h pv-gallery-img-scrollbar-h">'+
									'<span class="pv-gallery-scrollbar-h-track pv-gallery-img-scrollbar-h-track">'+
										'<span class="pv-gallery-scrollbar-h-handle pv-gallery-img-scrollbar-h-handle"></span>'+
									'</span>'+
								'</span>'+
							'</span>'+
						'</span>'+

						'<span class="pv-gallery-sidebar-container" unselectable="on">'+
							'<span class="pv-gallery-sidebar-content" >'+
								'<span class="pv-gallery-scrollbar-h pv-gallery-thumb-scrollbar-h">'+
									'<span class="pv-gallery-scrollbar-h-track pv-gallery-thumb-scrollbar-h-track">'+
										'<span class="pv-gallery-scrollbar-h-handle pv-gallery-thumb-scrollbar-h-handle"></span>'+
									'</span>'+
								'</span>'+
								'<span class="pv-gallery-sidebar-controler pv-gallery-sidebar-controler-pre"></span>'+
								'<span class="pv-gallery-sidebar-thumbnails-container">'+
									'<span class="pv-gallery-sidebar-thumbnails">'+
										'<!--用innerHTML写入被span.pv-gallery-sidebar-thumb包裹的img元素，并设置宽度货高度-->'+
									'</span>'+
								'</span>'+
								'<span class="pv-gallery-scrollbar-v pv-gallery-thumb-scrollbar-v">'+
									'<span class="pv-gallery-scrollbar-v-track pv-gallery-thumb-scrollbar-v-track">'+
										'<span class="pv-gallery-scrollbar-v-handle pv-gallery-thumb-scrollbar-v-handle"></span>'+
									'</span>'+
								'</span>'+
								'<span class="pv-gallery-sidebar-controler pv-gallery-sidebar-controler-next"></span>'+
							'</span>'+
						'</span>'+

					'</span>';
				document.body.appendChild(container);

				var maximizeTrigger=document.createElement('span');
				this.maximizeTrigger=maximizeTrigger;
				maximizeTrigger.innerHTML='-回到库-<span class="pv-gallery-maximize-trigger-close" title="关闭库"></span>';
				maximizeTrigger.className='pv-gallery-maximize-trigger';
				
				document.body.appendChild(maximizeTrigger);

				var validPos=['top','right','bottom','left'];
				var sBarPosition=prefs.gallery.sidebarPosition;
				if(validPos.indexOf(sBarPosition)==-1){
					sBarPosition='bottom';
				};

				this.sBarPosition=sBarPosition;
				this.selectedClassName='pv-gallery-sidebar-thumb_selected-' + sBarPosition;


				var sBarDirection;
				var isHorizontal=false;
				if(sBarPosition=='top' || sBarPosition=='bottom'){
					sBarDirection='h';//水平放置
					isHorizontal=true;
				}else{
					sBarDirection='v';//垂直放置
				};
				this.sBarDirection=sBarDirection;
				this.isHorizontal=isHorizontal;

				var classPrefix='pv-gallery-';
				var validClass=[
					'head',
					'head-command-close',
					'head-command-operate',
					'head-command-drop-list-category',
					'head-command-drop-list-others',
					'head-command-drop-list-share',

					'body',

					'img-container',

					'img-scrollbar-h',
					'img-scrollbar-h-handle',
					'img-scrollbar-h-track',

					'img-scrollbar-v',
					'img-scrollbar-v-handle',
					'img-scrollbar-v-track',

					'thumb-scrollbar-h',
					'thumb-scrollbar-h-handle',
					'thumb-scrollbar-h-track',

					'thumb-scrollbar-v',
					'thumb-scrollbar-v-handle',
					'thumb-scrollbar-v-track',

					'img-content',
					'img-parent',

					'img-controler-pre',
					'img-controler-next',

					'sidebar-container',
					'sidebar-content',

					'sidebar-controler-pre',
					'sidebar-controler-next',

					'sidebar-thumbnails',
					'sidebar-thumbnails-container',
				];

				var eleMaps={};
				this.eleMaps=eleMaps;

				validClass.forEach(function(c){
					eleMaps[c]=container.querySelector('.'+ classPrefix + c);
				});

				var posClass=[//需要添加'top bottom left right'class的元素
					'img-container',
					'sidebar-container',
					'sidebar-thumbnails-container',
				];
				posClass.forEach(function(c){
					eleMaps[c].classList.add(classPrefix + c + '-' +sBarPosition);
				});

				var hvClass=[//需要添加'v h'class的元素
					'sidebar-container',
					'sidebar-content',
					'sidebar-controler-pre',
					'sidebar-controler-next',
					'sidebar-thumbnails',
				];
				hvClass.forEach(function(c){
					eleMaps[c].classList.add(classPrefix + c + '-' + sBarDirection);
				});



				//图片区域水平方向的滚动条
				var imgScrollbarH=new this.Scrollbar({
						bar:eleMaps['img-scrollbar-h'],
						handle:eleMaps['img-scrollbar-h-handle'],
						track:eleMaps['img-scrollbar-h-track'],
					},
					eleMaps['img-parent'],
					eleMaps['img-content'],
					true);
					this.imgScrollbarH=imgScrollbarH;

				//图片区域垂直方向的滚动条
				var imgScrollbarV=new this.Scrollbar({
						bar:eleMaps['img-scrollbar-v'],
						handle:eleMaps['img-scrollbar-v-handle'],
						track:eleMaps['img-scrollbar-v-track'],
					},
					eleMaps['img-parent'],
					eleMaps['img-content'],
					false);
				this.imgScrollbarV=imgScrollbarV;

				//缩略图区域的滚动条
				var thumbScrollbar;
				if(isHorizontal){
					thumbScrollbar=new this.Scrollbar({
						bar:eleMaps['thumb-scrollbar-h'],
						handle:eleMaps['thumb-scrollbar-h-handle'],
						track:eleMaps['thumb-scrollbar-h-track'],
					},
					eleMaps['sidebar-thumbnails'],
					eleMaps['sidebar-thumbnails-container'],
					true); 
				}else{
					thumbScrollbar=new this.Scrollbar({
						bar:eleMaps['thumb-scrollbar-v'],
						handle:eleMaps['thumb-scrollbar-v-handle'],
						track:eleMaps['thumb-scrollbar-v-track'],
					},
					eleMaps['sidebar-thumbnails'],
					eleMaps['sidebar-thumbnails-container'],
					false); 
				};
				this.thumbScrollbar=thumbScrollbar;



				var self=this;


				var oAllImgs={//图片的总类，统计,初始化值
					rule:{
						shown:true,
						count:0,
						description:'由高级规则匹配出来的',
						name:'高级规则',
					},
					tpRule:{
						shown:true,
						count:0,
						description:'由通配规则匹配出来的',
						name:'通配规则',
					},
					scale:{
						shown:true,
						count:0,
						description:'js自动查找，相对页面显示的图片有缩放过的',
						name:'缩放过的',
					},
					force:{
						shown:true,
						count:0,
						description:'js自动查找，无缩放过的，但是满足一定的大小',
						name:'无缩放过',
					},
				};
				this.oAllImgs=oAllImgs;

				//生成分类下拉列表
				var typeMark='';
				var oAllImgs_i;
				for(var i in oAllImgs){
					if(!oAllImgs.hasOwnProperty(i))continue;
					oAllImgs_i=oAllImgs[i];
					typeMark+=
						'<span class="pv-gallery-head-command-drop-list-item" title="'+oAllImgs_i.description+'">'+
							'<input type="checkbox" data-type="'+i+'" id="pv-gallery-head-command-drop-list-category-item-'+i+'" />'+
							'<label for="pv-gallery-head-command-drop-list-category-item-'+i+'">'+oAllImgs_i.name+'</label>'+
						'</span>';
				};
				eleMaps['head-command-drop-list-category'].innerHTML=typeMark;

				//分类下拉列表的点击发生change事件的处理
				eleMaps['head-command-drop-list-category'].addEventListener('change',function(e){
					var target=e.target;
					self.allImgs[target.dataset['type']].shown=target.checked;
					self.switchThumbVisible();//切换图片类别显隐;
				},true);


				//命令下拉列表的点击处理
				eleMaps['head-command-drop-list-others'].addEventListener('click',function(e){
					if(e.button!=0)return;//左键
					var target=e.target;
					var command=target.dataset['command'];
					if(!command)return;
					switch(command){
						case 'openInNewWindow':{
							window.open(self.img.src,'_blank');
						}break;
						case 'scrollIntoView':{
							var relatedThumb=self.relatedThumb;
							var index=arrayFn.indexOf.call(self.imgSpans,relatedThumb);
							var targetImg=self.data[index].img;

							if(targetImg){
 								if(!document.contains(targetImg) || getComputedStyle(targetImg,null).display=='none'){//图片不存在文档中，或者隐藏了。
									alert('图片不在文档中，或者被隐藏了，无法定位！');
									return;
								}; 
								self.minimize();
								setTimeout(function(){
									self.navigateToImg(targetImg);
									flashEle(targetImg);
								},0);

							}else{//frame发送过来的时候删除了不能传送的图片

								document.addEventListener('pv-navigateToImg',function(e){
									//console.log('pv-navigateToImg',e);
									if(!e.detail){
										alert('图片不在文档中，或者被隐藏了，无法定位！');
										return;
									}; 
									self.minimize();
									setTimeout(function(){//将frame滚动到中间位置
										if(self.iframe){
											self.navigateToImg(self.iframe);
										};
									},0);
								},true);
								window.postMessage({//问问frame。。
									messageID:messageID,
									command:'navigateToImg',
									index:index,
									to:self.from,
								},'*');
							};

						}break;
					};
				},true);


				//生成分享的下拉列表
				var shareMark='';
				var shareItem;
				for(var i in prefs.share){
					if(!prefs.share.hasOwnProperty(i))continue;
					shareItem=prefs.share[i];
					if(shareItem.disabled)continue;
					shareMark+=(
						'<span class="pv-gallery-head-command-drop-list-item" data-site="'+i+'" style="\
							background-image:url(\''+ shareItem.icon +'\');\
							background-position:4px center;\
							background-repeat:no-repeat;\
							padding-left:24px;">'+shareItem.name+'</span>');
				};

				eleMaps['head-command-drop-list-share'].innerHTML=shareMark;

				//分享下拉列表的点击处理
				eleMaps['head-command-drop-list-share'].addEventListener('click',function(e){
					if(e.button!=0)return;//左键
					var target=e.target;
					var site=target.dataset['site'];
					if(!site)return;
					var site_info=prefs.share[site];
					var param=site_info.api.call(self.img,{
						title:encodeURIComponent(document.title),
						pic:encodeURIComponent(self.img.src),
						url:encodeURIComponent(location.href),
					});
					if(!param)return;
					window.open(param.url,'_blank','height='+param.wSize.h+',width='+param.wSize.w+',left=30,top=30,location=no,status=no,toolbar=no,menubar=no,scrollbars=yes');
				},true);


				var loadThumbsTimer;
				eleMaps['sidebar-thumbnails-container'].addEventListener('scroll',function(e){//发生scroll事件时加载缩略图
					clearTimeout(loadThumbsTimer);//加个延时，在连续触发的时候缓一缓。
					loadThumbsTimer=setTimeout(function(){
						self.loadThumb();
					},166);
				},false);

				addWheelEvent(eleMaps['body'],function(e){//wheel事件
					if(e.deltaZ!=0)return;//z轴
					var target=e.target;
					e.preventDefault();
					if(eleMaps['sidebar-container'].contains(target)){//缩略图区滚动滚轮翻图片
						var distance=self.sideLengthO;
						if(e.deltaY<0 || e.deltaX<0){//向上滚
							distance=-distance;
						};
						thumbScrollbar.scrollBy(distance)
					}else{//图片区域滚动
						var distance=100;
						if(e.deltaY!=0){//y轴
							if(e.deltaY < 0){
								distance=-distance;
							};
							if(eleMaps['img-scrollbar-h'].contains(target)){//如果在横向滚动条上。
								imgScrollbarH.scrollBy(distance);
							}else{
								imgScrollbarV.scrollBy(distance);
							};
						}else{//x轴
							if(e.deltaX < 0){
								distance=-distance;
							};
							imgScrollbarH.scrollBy(distance);
						};
					};
				},true);


				//focus,blur;
				addCusMouseEvent('mouseenter',container,function(){
					this.focus();
				});
				addCusMouseEvent('mouseleave',container,function(){
					this.blur();
				});

				//上下左右切换图片,空格键模拟滚动一页

				var validKeyCode=[38,39,40,37,32,9]//上右下左,32空格,tab禁止焦点切换。
				var keyUp=true;
				var keyIntervalTimer;

				document.addEventListener('keydown',function(e){
					var keyCode=e.keyCode;
					var index=validKeyCode.indexOf(keyCode);
					if(index==-1)return;

					var target=e.target;

					if(!container.contains(target))return;//触发焦点不再gallery里面。
					e.preventDefault();

					if(keyCode==9)return;//tab键
					if(keyCode==32){//32空格，模拟滚动一页
						imgScrollbarV.scrollByPage(1);
						return;
					};

					if(!keyUp)return;//已按下。
					keyUp=false;

					switch(index){
						case 0:;
						case 3:{
							self.selectPrevious();
							keyIntervalTimer=setInterval(function(e){
								self.selectPrevious();
							},600);
						}break;
						case 1:;
						case 2:{
							self.selectNext();
							keyIntervalTimer=setInterval(function(e){
								self.selectNext();
							},600);
						}break;
					};

					function keyUpHandler(e){
						if(e.keyCode!=validKeyCode[index])return;
						this.removeEventListener('keyup',keyUpHandler,false);
						clearInterval(keyIntervalTimer);
						keyUp=true;
					};
					this.addEventListener('keyup',keyUpHandler,false);

				},true);


				var imgDraged;
				eleMaps['img-parent'].addEventListener('mousedown',function(e){//如果图片尺寸大于屏幕的时候按住图片进行拖移
					var target=e.target;
					if(e.button!=0 || target.nodeName!='IMG')return;
					var bigger=target.classList.contains('pv-gallery-img_zoom-out');//如果是大于屏幕

					var oClient={
						x:e.clientX,
						y:e.clientY,
					};

					var oScroll={
						left:self.imgScrollbarH.getScrolled(),
						top:self.imgScrollbarV.getScrolled(),
					};

					var moveFiredCount=0;
					var moveHandler=function(e){
						moveFiredCount++;
						if(moveFiredCount<2){//给个缓冲。。
							return;
						};
						imgDraged=true;
						if(bigger){
							target.style.cursor='pointer';
							self.imgScrollbarV.scroll(oScroll.top-(e.clientY-oClient.y));
							self.imgScrollbarH.scroll(oScroll.left-(e.clientX-oClient.x));
						};
					};

					var upHandler=function(){
						target.style.cursor='';

						//拖曳之后阻止随后可能产生click事件产生的大小切换。
						//确保在随后的click事件发生后执行
						setTimeout(function(){
							imgDraged=false;
						},0);

						document.removeEventListener('mousemove',moveHandler,true);
						document.removeEventListener('mouseup',upHandler,true);
					};

					document.addEventListener('mousemove',moveHandler,true);
					document.addEventListener('mouseup',upHandler,true);
				},true);

				eleMaps['img-parent'].addEventListener('click',function(e){//点击图片本身就行图片缩放处理
					var target=e.target;
					if(e.button!=0 || target.nodeName!='IMG')return;

					if(imgDraged){//在拖动后触发的click事件，取消掉。免得一拖动完就立即进行的缩放。。。
						imgDraged=false;
						return;
					}; 

					if(target.classList.contains('pv-gallery-img_zoom-in')){//放大
						self.fitContains=false;
						var zoomX = typeof e.offsetX=='undefined' ? e.layerX : e.offsetX;
						var zoomY = typeof e.offsetY=='undefined' ? e.layerY : e.offsetY;
						var scaleX=zoomX/target.clientWidth;
						var scaleY=zoomY/target.clientHeight;
						self.fitToScreen({
							x:scaleX,
							y:scaleY,
						});
					}else if(target.classList.contains('pv-gallery-img_zoom-out')){
						self.fitContains=true;
						self.fitToScreen();
					};
				},true);

				var mouseIntervalTimer;
				container.addEventListener('mousedown',function(e){//鼠标按在导航上，切换图片
					if(e.button!=0)return;//左键
					var target=e.target;
					if(target.nodeName=='IMG')e.preventDefault();

					var matched=true;
					switch(target){
						case eleMaps['img-controler-pre']:;
						case eleMaps['sidebar-controler-pre']:{//上一个
							self.selectPrevious();
							clearInterval(mouseIntervalTimer);
							mouseIntervalTimer=setInterval(function(e){
								self.selectPrevious();
							},600);
						}break;
						case eleMaps['img-controler-next']:;
						case eleMaps['sidebar-controler-next']:{//下一个
							self.selectNext();
							clearInterval(mouseIntervalTimer);
							mouseIntervalTimer=setInterval(function(e){
								self.selectNext();
							},600);
						}break;
						default:{
							matched=false;
						}break;
					};

					function mouseUpHandler(e){//opera，按下左键的时候，按右键然后松开不会触发mouseup，再松开左键，还是不会触发mouseup
						document.removeEventListener('mouseup',mouseUpHandler,true);
						clearInterval(mouseIntervalTimer);
					};

					if(matched){
						e.preventDefault();
						document.addEventListener('mouseup',mouseUpHandler,true);
					};
				},false);

				eleMaps['sidebar-thumbnails'].addEventListener('click',function(e){//点击缩略图切换
					if(e.button!=0)return;//左键
					var target=e.target;
					var targetP;
					if(!target.dataset['src'] && (targetP=target.parentNode) && !targetP.dataset['src'])return;
					target=targetP? targetP : target;
					var loadError=target.querySelector('.pv-gallery-sidebar-thumb-loading_error');
					if(loadError && loadError.clientWidth!=0){//读取错误了需要重载图片。
						self.getImg(target);
					}else{
						self.select(target);
					};
				},false);

				eleMaps['head'].addEventListener('click',function(e){//顶栏上面的命令
					if(e.button!=0)return;
					var target=e.target;
					switch(target){
						case eleMaps['head-command-close']:{
							self.close();
						}break;
						case eleMaps['head-command-operate']:{
							imgReady(self.img.src,{
								ready:function(){
									new ImgWindowC(this);
								},
							});
						}break;
					};
				},false);


				//点击还原。
				maximizeTrigger.addEventListener('click',function(e){
					var target=e.target;
					this.style.display='none';
					if(target==this){
						self.show();
						self.resizeHandler();
					}else{
						self.minimized=false;
					};
				},true);


				this._resizeHandler=this.resizeHandler.bind(this);

				this.sideLength=isHorizontal ?  eleMaps['sidebar-thumbnails'].clientHeight : eleMaps['sidebar-thumbnails'].clientWidth;
				this.sideLengthO=this.sideLength + 3;//加上margin

				//插入动态生成的css数据。
				this.globalSSheet.insertRule('.pv-gallery-sidebar-thumb-container{'+ 
					((isHorizontal ? 'width:' : 'height:')  + this.sideLength + 'px;')+
				'}',this.globalSSheet.cssRules.length);

				this.forceRepaintTimes=0;

				container.style.display='none';
				this.shown=false;
			},
			navigateToImg:function(targetImg){
				targetImg.scrollIntoView();//先调用原方法，可以让overflow hidden的滚动出来。
				//让图片近可能的居中

				var imgBCRect=getTargetPosition(targetImg);

				window.scrollBy(imgBCRect.l - (window.innerWidth - imgBCRect.w)/2,
					imgBCRect.t - (window.innerHeight - imgBCRect.h)/2);

			},
			selectPrevious:function(){
				var pre;
				var _pre=this.selected.previousElementSibling;
				while(_pre){
					if(_pre.clientWidth!=0){
						pre=_pre;
						break;
					};
					_pre=_pre.previousElementSibling;
				};

				this.select(pre);

			},
			selectNext:function(){
				var next;
				var _next=this.selected.nextElementSibling;
				while(_next){
					if(_next.clientWidth!=0){
						next=_next;
						break;
					};
					_next=_next.nextElementSibling;
				};

				this.select(next);

			},
			close:function(){
				this.shown=false;
				this.minimized=false;
				galleryMode=false;
				this.gallery.blur();
				this.gallery.style.display='none';
				var des=document.documentElement.style;
				des.overflowX=this.deOverflow.x;
				des.overflowY=this.deOverflow.y;
				window.removeEventListener('resize',this._resizeHandler,true);
			},
			show:function(){
				this.shown=true;
				galleryMode=true;
				var des=document.documentElement.style;
				this.deOverflow={
					x:des.overflowX,
					y:des.overflowY,
				};
				des.overflow='hidden';
				this.gallery.style.display='';
				this.gallery.focus();
				window.addEventListener('resize',this._resizeHandler,true);
			},
			minimize:function(){
				this.close();
				this.maximizeTrigger.style.display='block';
				this.minimized=true;
			},
			selectedIntoView:function(){
				var thumBC=this.eleMaps['sidebar-thumbnails-container'];
				//需要滚动的距离。
				var needScrollDis=this.isHorizontal ? this.selected.offsetLeft : this.selected.offsetTop;
				//尽可能的居中显示
				var thumBCClient=this.isHorizontal ? thumBC.clientWidth : thumBC.clientHeight;
				var scrollCenter=Math.max((thumBCClient - this.sideLengthO)/2,0);

				this.thumbScrollbar.scroll(needScrollDis-scrollCenter);
			},
			select:function(ele){
				if(!ele || this.selected==ele)return;
				if(this.selected){
					this.selected.classList.remove(this.selectedClassName);
					this.selected.classList.remove('pv-gallery-sidebar-thumb_selected');
				};
				ele.classList.add(this.selectedClassName);
				ele.classList.add('pv-gallery-sidebar-thumb_selected');

				this.selected=ele;

				var self=this;
				clearTimeout(this.loadImgTimer);
				this.loadImgTimer=setTimeout(function(){//快速跳转的时候不要尝试读取图片。
					self.loadImg(ele);
				},200);

				this.selectedIntoView();
				this.forceRepaint();
			},
			clear:function(){

				this.allLoading=[];//读取中的图片数组

				this.allImgs=cloneObject(this.oAllImgs,true);

				if(this.img){
					this.img.style.display='none';
				};

				this.img=null;
				this.selected==null;
				//清空dom
				this.eleMaps['sidebar-thumbnails'].innerHTML='';
				//隐藏滚动条
				this.imgScrollbarV.hide();
				this.imgScrollbarH.hide();
				this.thumbScrollbar.hide();
			},
			unique:function(data){
				var imgSrc=data.target.src;

				var data_i,
					data_i_src,
					dataSrcs=[];

				var index;

				for(var i=0,ii=data.length;i<ii;i++){
					data_i=data[i];
					data_i_src=data_i.src;
					if(dataSrcs.indexOf(data_i_src)!=-1){//已经存在
						data.splice(i,1);//移除
						i--;
						ii--;
						continue;
					};
					dataSrcs.push(data_i_src);

					if(imgSrc==data_i_src){
						index=i;
					};
				};

				if(typeof index =='undefined'){
					index=0;
					data.unshift(data.target);
				};

				delete data.target;

				return {
					data:data,
					index:index,
				};
			},
			load:function(data,from){
				if(this.shown || this.minimized){//只允许打开一个,请先关掉当前已经打开的库

					if(from){//frame发送过来的数据。
						window.postMessage({
							messageID:messageID,
							command:'sendFail',
							to:from,
						},'*');
					};

					if(this.minimized){
						alert('请先关掉当前已经打开的库');
						flashEle(this.maximizeTrigger);
					};
					return;
				};

				var self=this;
				if(from){//来自frame，获取这个frame所在的iframe标签。
					window.postMessage({
						messageID:messageID,
						command:'getIframeObject',
						windowId:from,
					},'*');
					document.addEventListener('pv-getIframeObject',function(e){
						self.iframe=e.detail;
					},true);
				};


				this.clear();//还原对象的一些修改，以便复用。
				this.show();

				var unique=this.unique(data);
				data=unique.data;
				var index=unique.index;

				//console.log(data);

				this.data=data;
				this.from=from;//如果来自frame，那么这个from应该保存了那个frame的窗口id，便于以后通信。

				var spanMark='';
				var data_i;
				var allImgs=this.allImgs;
				for(var i=0,ii=data.length;i<ii;i++){
					data_i=data[i];
					allImgs[data_i.type].count++;
					 spanMark += 
					 '<span class="pv-gallery-sidebar-thumb-container'+
						'" data-type="' + data_i.type + 
						'" data-src="' + data_i.src + 
						'" data-thumb-src="' + data_i.imgSrc +
						'">'+
						'<span class="pv-gallery-vertical-align-helper"></span>'+
						'<span class="pv-gallery-sidebar-thumb-loading" title="正在读取中......"></span>'+
					'</span>';
				};


				var thumbnails=this.eleMaps['sidebar-thumbnails'];
				thumbnails.innerHTML=spanMark;

				//写入类别数据。
				var gallery=this.gallery;
				var input,label,allImgs_i;

				for(var i in allImgs){
					if(!allImgs.hasOwnProperty(i))continue;
					allImgs_i=allImgs[i];
					input=gallery.querySelector('#pv-gallery-head-command-drop-list-category-item-' + i);
					input.checked=allImgs_i.shown;
					if(allImgs_i.count==0){
						input.disabled=true;
						input.parentNode.classList.add('pv-gallery-head-command-drop-list-item_disabled');
					}else{
						input.disabled=false;
						input.parentNode.classList.remove('pv-gallery-head-command-drop-list-item_disabled');
					};

					label=gallery.querySelector('label[for="pv-gallery-head-command-drop-list-category-item-' + i + '"]');
					label.textContent=label.textContent.replace(/（.*）/i,'') + '（' + allImgs_i.count + '）';
				};


				this.imgSpans=thumbnails.children;

				this.select(this.imgSpans[index]);
				this.switchThumbVisible();

			},
			switchThumbVisible:function(){
				var style=this.thumbVisibleStyle;
				var count=0;
				var styleText=[];
				var allImgs=this.allImgs;
				var allImgs_i;

				for(var i in allImgs){
					if(!allImgs.hasOwnProperty(i))continue;
					allImgs_i=allImgs[i];
					if(allImgs_i.shown){
						count+=allImgs_i.count;
					}else{
						styleText.push('.pv-gallery-sidebar-thumb-container[data-type="'+i+'"]');
					};
				};

				//写入style;
				style.textContent=styleText.join(',') + '{\
					display:none !important;\
				}';

				//设置宽度
				if(this.isHorizontal){
					this.eleMaps['sidebar-thumbnails'].style.width=this.sideLengthO * count + 'px';//如果是水平放置，需要设置宽度
				};

				//初始化缩略图区的滚动条
				this.thumbScrollbar.reset();

				//载入缩略图
				this.loadThumb();
			},
			forceRepaint:function(){//解决opera的fixed元素，当滚动条不再最高处的时候，不重绘fixed元素的问题。
				if(envir.opera){
					this.forceRepaintTimes % 2 ==0 ? window.scrollBy(0,1) : window.scrollBy(0,-1);
					this.forceRepaintTimes++;
				};
			},
			resizeHandler:function(){//窗口变化时，调整一些东西。
				this.fitToScreen();
				this.thumbScrollbar.reset();
				//this.selectedIntoView();
				this.loadThumb();
			},
			getImg:function(ele){
				var allLoading=this.allLoading;

				var src=ele.dataset['src'];
				var index=allLoading.indexOf(src);
				if(index!=-1){
					allLoading.splice(index,1);
				};

				allLoading.push(src);

				//上一个读取中的图片，不是当前显示的。那么直接终止
				if(this.imgReady && this.img && this.imgReady.img.src!=this.img.src){
					this.imgReady.abort();
					this.imgReady.loadingIndicator.style.removeProperty('display');
				};


				//读取指示器。
				var loadingIndicator=ele.querySelector('.pv-gallery-sidebar-thumb-loading');
				loadingIndicator.classList.remove('pv-gallery-sidebar-thumb-loading_error');
				loadingIndicator.removeAttribute('title');
				loadingIndicator.style.display='block';

				var self=this;

				this.imgReady=imgReady(src,{
					ready:function(){
						if(allLoading.indexOf(src)!=allLoading.length-1)return;//如果不是最后一张
						loadingIndicator.style.removeProperty('display');
						self.loadImg(this,ele);
					},
					loadEnd:function(e){//在loadend后开始预读。
						if(allLoading.indexOf(src)!=allLoading.length-1)return;
						if(e.type=='error'){
							loadingIndicator.classList.add('pv-gallery-sidebar-thumb-loading_error');
							loadingIndicator.title='点击重试';
						};
						if(self.preloading){//结束上次的预读。
							self.preloading.abort();
						};
						//console.log(this,'预读开始');
						if(prefs.gallery.preload){
							self.preloading=new self.Preload(ele);
							self.preloading.preload();
						};
					},
				});

				this.imgReady.loadingIndicator=loadingIndicator;
			},
			Preload:function(ele){
				this.ele=ele;
				this.init();
			},
			Scrollbar:function(scrollbar,content,container,isHorizontal){
				this.scrollbar=scrollbar;
				this.content=content;
				this.container=container;
				this.isHorizontal=isHorizontal
				this.init();
			},
			loadImg:function(img,relatedThumb){
				if(img.nodeName!='IMG'){//先读取。
					this.getImg(img);
					return;
				};

				if(this.img){
					this.img.style.display='none';
				};

				this.img=img;
				this.relatedThumb=relatedThumb;
				img.className='pv-gallery-img';
				this.eleMaps['img-parent'].appendChild(img);
				this.fitContains=prefs.gallery.fitToScreen;//适应屏幕
				this.fitToScreen();
			},
			fitToScreen:function(scale){

				var container=this.eleMaps['img-content'];
				var containerSize={
					h:container.clientHeight,
					w:container.clientWidth,
				};

				var img=this.img;
				img.classList.remove('pv-gallery-img_zoom-in');
				img.classList.remove('pv-gallery-img_zoom-out');
				img.removeAttribute('height');
				img.removeAttribute('width');

				var content=this.eleMaps['img-parent'];
				var contentSize={
					w:content.offsetWidth,
					h:content.offsetHeight,
				};

				var larger=contentSize.w > containerSize.w || contentSize.h > containerSize.h;

				if(this.fitContains){//适应屏幕
					this.imgScrollbarV.hide();
					this.imgScrollbarH.hide();
					if(larger){
						img.classList.add('pv-gallery-img_zoom-in');
						if(contentSize.h/contentSize.w >=containerSize.h/containerSize.w){
							img.height=containerSize.h-20;//20是父元素padding之和
						}else{
							img.width=containerSize.w-20;
						};
					};
				}else{//不做尺寸调整，如果大于屏幕就出现滚动条
					this.imgScrollbarV.reset();
					this.imgScrollbarH.reset();

					if(larger){
						img.classList.add('pv-gallery-img_zoom-out');
						var vd=0,hd=0;
						if(scale){//通过鼠标点击进行的切换。
							hd=container.scrollWidth * scale.x - containerSize.w/2
							vd=container.scrollHeight * scale.y - containerSize.h/2
						};
						this.imgScrollbarH.scroll(hd);
						this.imgScrollbarV.scroll(vd);
					};
				};
			},
			loadThumb:function(){//读取可视范围里面的缩略图

				var self=this;

				function ready(){
					var naturalSize={
						h:this.naturalHeight,
						w:this.naturalWidth,
					};
					var style=this.style;
					style.removeProperty('width');
					style.removeProperty('height');
					if(naturalSize.h > self.sideLength || naturalSize.w > self.sideLength){
						if(naturalSize.h>=naturalSize.w){
							style.height='100%';
						}else{
							style.width='100%';
						};
					};
					self.forceRepaint();
				};


				var pro=this.isHorizontal ? ['scrollLeft','clientWidth','offsetLeft'] : ['scrollTop','clientHeight','offsetTop'];
				var thumbC=this.eleMaps['sidebar-thumbnails-container'];

				var scrolled=thumbC[pro[0]];
				var thumbCClient=thumbC[pro[1]];

				var loadDis=scrolled - this.sideLengthO;
				var loadIndex=Math.floor(scrolled/this.sideLengthO);//至少从第几张开始读取。

				var loadStopDis=scrolled + thumbCClient;

				var imgSpans=this.imgSpans;
				var span_i;
				var spanOffset;
				var thumb;

				for(var i=loadIndex,ii=imgSpans.length;i<ii;i++){
					span_i=imgSpans[i];
					if(span_i.clientWidth==0)continue;//隐藏的

					spanOffset=span_i[pro[2]];
					if(spanOffset <= loadDis)continue;//在滚动条上面了
					if(spanOffset >= loadStopDis)break;//在滚动条下面了

					if(span_i.dataset['thumbLoaded'])continue;//已经加载了缩略图

					thumb=new Image();
					thumb.src=span_i.dataset['thumbSrc'];
					thumb.style.cssText='\
						height:100%;\
						width:100%;\
					';
					thumb.className='pv-gallery-sidebar-thumb';

					//GM环境下的dataset可读不可写。。
					span_i.setAttribute('data-thumb-loaded','true');
					span_i.appendChild(thumb);

					imgReady(thumb,{
						ready:ready,
					});
				};

			},
			addStyle:function(){
				var style=document.createElement('style');
				style.type='text/css';
				style.textContent='\
					/*最外层容器*/\
					.pv-gallery-container {\
						position: fixed;\
						top: 0;\
						left: 0;\
						width: 100%;\
						height: 100%;\
						padding: 0;\
						margin: 0;\
						border: none;\
						z-index:899999999;\
						background-color: transparent;\
					}\
					/*全局border-box*/\
					.pv-gallery-container span{\
						-moz-box-sizing: border-box;\
						box-sizing: border-box;\
					}\
					/*点击还原的工具条*/\
					.pv-gallery-maximize-trigger{\
						position:fixed;\
						bottom:15px;\
						left:15px;\
						display:none;\
						background:#000;\
						opacity:0.6;\
						padding-left:10px;\
						font-size:16px;\
						line-height:0;\
						color:white;\
						cursor:pointer;\
						box-shadow:3px 3px 0 0 #333;\
						z-index:899999998;\
					}\
					.pv-gallery-maximize-trigger:hover{\
						opacity:0.9;\
					}\
					.pv-gallery-maximize-trigger-close{\
						display:inline-block;\
						padding-left:10px;\
						vertical-align:middle;\
						height:30px;\
						padding:10px 0;\
						width:24px;\
						background:url("'+prefs.icons.loadingCancle+'") center no-repeat;\
					}\
					.pv-gallery-maximize-trigger-close:hover{\
						background-color:#333;\
					}\
					/*顶栏*/\
					.pv-gallery-head {\
						position: absolute;\
						top: 0;\
						left: 0;\
						width: 100%;\
						height:30px;\
						z-index:2;\
						background-color:rgba(0,0,0,0.96);\
						border:none;\
						border-bottom:1px solid #333333;\
						text-align:right;\
						line-height:0;\
						font-size:14px;\
						color:#757575;\
					}\
					/*顶栏左边*/\
					.pv-gallery-head-float-left{\
						float:left;\
						height:100px;\
						text-align:left;\
					}\
					/*顶栏里面的按钮样式-开始*/\
					.pv-gallery-head-command-container{\
						display:inline-block;\
						height:100%;\
						position:relative;\
					}\
					/* after伪类生成标识下拉菜单的三角图标*/\
					.pv-gallery-head-command-container > .pv-gallery-head-command::after{\
						content:"";\
						display:inline-block;\
						vertical-align:middle;\
						border:none;\
						border-top:7px solid #757575;\
						border-left:5px solid transparent;\
						border-right:5px solid transparent;\
						margin-left:5px;\
						-moz-transition:all 0.3s ease-in-out 0s;\
						-webkit-transition:all 0.3s ease-in-out 0s;\
						transition:all 0.3s ease-in-out 0s;\
					}\
					.pv-gallery-head-command-container:hover{\
						box-shadow:0 0 3px #808080;\
					}\
					.pv-gallery-head-command-container:hover > .pv-gallery-head-command::after{\
						-webkit-transform:rotate(180deg);\
						-moz-transform:rotate(180deg);\
						transform:rotate(180deg);\
						border-top:7px solid #ccc;\
					}\
					.pv-gallery-head-command-drop-list{\
						position:absolute;\
						right:0;\
						display:none;\
						box-shadow:0 0 3px #808080;\
						background-color:#272727;\
						line-height:1.5;\
						text-align:left;\
						padding:10px;\
						color:#ccc;\
					}\
					.pv-gallery-head-command-drop-list-item{\
						display:block;\
						padding:2px 5px;\
						cursor:pointer;\
						white-space:nowrap;\
					}\
					.pv-gallery-head-command-drop-list-item_disabled{\
						color:#757575;\
					}\
					.pv-gallery-head-command-drop-list-category label{\
						padding-left:3px;\
					}\
					.pv-gallery-head-command-drop-list-item > * {\
						vertical-align:middle;\
					}\
					.pv-gallery-head-command-drop-list-item:hover{\
						background-color:#404040;\
					}\
					.pv-gallery-head-command-container:hover > .pv-gallery-head-command-drop-list{\
						display:block;\
					}\
					.pv-gallery-head-command{\
						display:inline-block;\
						cursor:pointer;\
						height:100%;\
						padding:0 12px;\
						text-align:center;\
						margin-bottom:-1px;\
						position:relative;\
						z-index:1;\
					}\
					.pv-gallery-head-command:hover{\
						background-color:#272727;\
						color:#ccc;\
					}\
					.pv-gallery-head-command-container:hover > .pv-gallery-head-command{\
						background-color:#272727;\
						color:#ccc;\
					}\
					.pv-gallery-head-command-close{\
						width:40px;\
						margin-left:10px;\
						border-left: 1px solid #333333;\
						background:transparent no-repeat center;\
						background-image:url("'+prefs.icons.loadingCancle+'");\
					}\
					/*顶栏里面的按钮样式-结束*/\
					.pv-gallery-body {\
						display: block;\
						height: 100%;\
						width: 100%;\
						margin: 0;\
						padding: 0;\
						border: none;\
						border-top: 30px solid transparent;\
						position: relative;\
						background-clip: padding-box;\
					}\
					.pv-gallery-img-container {\
						display: block;\
						padding: 0;\
						margin: 0;\
						border: none;\
						height: 100%;\
						width: 100%;\
						background-clip: padding-box;\
						background-color: rgba(20,20,20,0.96);\
						position:relative;\
					}\
					.pv-gallery-img-container-top {\
						border-top: '+ prefs.gallery.sidebarSize +'px solid transparent;\
					}\
					.pv-gallery-img-container-right {\
						border-right: '+ prefs.gallery.sidebarSize +'px solid transparent;\
					}\
					.pv-gallery-img-container-bottom {\
						border-bottom: '+ prefs.gallery.sidebarSize +'px solid transparent;\
					}\
					.pv-gallery-img-container-left {\
						border-left: '+ prefs.gallery.sidebarSize +'px solid transparent;\
					}\
					.pv-gallery-img-container-left-side,\
					.pv-gallery-img-container-right-side{\
						position:absolute;\
						height:100%;\
						top:0;\
						z-index:2;\
					}\
					.pv-gallery-img-container-left-side{\
						left:0;\
					}\
					.pv-gallery-img-container-right-side{\
						right:0;\
					}\
					.pv-gallery-img-container-bottom-side{\
						position:absolute;\
						width:100%;\
						left:0;\
						bottom:0;\
						z-index:2;\
					}\
					.pv-gallery-img-controler{\
						position:absolute;\
						top:50%;\
						height:120px;\
						width:50px;\
						margin-top:-60px;\
						cursor:pointer;\
						opacity:0.3;\
					}\
					.pv-gallery-img-controler-pre{\
						background:rgba(70,70,70,0.5) url("'+prefs.icons.arrowLeft+'") no-repeat center;\
						left:10px;\
					}\
					.pv-gallery-img-controler-next{\
						background:rgba(70,70,70,0.5) url("'+prefs.icons.arrowRight+'") no-repeat center;\
						right:10px;\
					}\
					.pv-gallery-img-controler:hover{\
						opacity:0.8;\
					}\
					/*滚动条样式--开始*/\
					.pv-gallery-scrollbar-h,\
					.pv-gallery-scrollbar-v{\
						display:none;\
						position:relative;\
						z-index:1;\
						opacity:0.6;\
					}\
					.pv-gallery-thumb-scrollbar-v,\
					.pv-gallery-thumb-scrollbar-h{\
						position:absolute;\
					}\
					.pv-gallery-scrollbar-h:hover,\
					.pv-gallery-scrollbar-v:hover{\
						opacity:0.95;\
					}\
					.pv-gallery-scrollbar-h{\
						width:100%;\
						overflow:hidden;\
						padding:0;\
						padding-left:2px;\
						padding-right:16px;\
					}\
					.pv-gallery-scrollbar-v{\
						height:100%;\
						padding:0;\
						padding-top:2px;\
						padding-bottom:16px;\
					}\
					.pv-gallery-thumb-scrollbar-h{\
						bottom:0;\
						left:0;\
						padding:0 2px;\
					}\
					.pv-gallery-thumb-scrollbar-v{\
						right:0;\
						top:0;\
						padding:2px 0;\
					}\
					.pv-gallery-scrollbar-h-track,\
					.pv-gallery-scrollbar-v-track{\
						position:relative;\
						display:block;\
						background-color:rgba(100,100,100,1);\
					}\
					.pv-gallery-scrollbar-h-track{\
						margin:5px 0;\
						height:10px;\
						width:100%;\
					}\
					.pv-gallery-scrollbar-h:hover .pv-gallery-scrollbar-h-track{\
						height:16px;\
					}\
					.pv-gallery-scrollbar-v-track{\
						height:100%;\
						width:10px;\
						margin:0 5px;\
					}\
					.pv-gallery-scrollbar-v:hover .pv-gallery-scrollbar-v-track{\
						width:16px;\
					}\
					.pv-gallery-scrollbar-h-handle,\
					.pv-gallery-scrollbar-v-handle{\
						position:absolute;\
						background-color:black;\
					}\
					.pv-gallery-scrollbar-h-handle:hover,\
					.pv-gallery-scrollbar-v-handle:hover{\
						background-color:#502121;\
					}\
					.pv-gallery-scrollbar-h-handle:active,\
					.pv-gallery-scrollbar-v-handle:active{\
						background-color:#391A1A;\
					}\
					.pv-gallery-scrollbar-h-handle{\
						height:100%;\
						width:20px;\
						left:10px;\
						top:0;\
					}\
					.pv-gallery-scrollbar-v-handle{\
						height:20px;\
						width:100%;\
						top:10px;\
						left:0;\
					}\
					/*滚动条样式--结束*/\
					.pv-gallery-img-content{\
						display:block;\
						width:100%;\
						height:100%;\
						overflow:hidden;\
						text-align:center;\
						padding:0;\
						border:none;\
						margin:0;\
						line-height:0;\
						font-size:0;\
						white-space:nowrap;\
					}\
					.pv-gallery-img-parent{\
						display:inline-block;\
						vertical-align:middle;\
						padding:10px;\
						border:none;\
						margin:0;\
						line-height:0;\
						font-size:0;\
					}\
					.pv-gallery-img{\
						box-shadow:0 0 10px rgba(0,0,0,0.6);\
						display:inline-block;\
						vertical-align:middle;\
						padding:0;\
						border:none;\
						margin:0;\
					}\
					.pv-gallery-img_zoom-out{\
						cursor:'+support.cssCursorValue.zoomOut+';\
					}\
					.pv-gallery-img_zoom-in{\
						cursor:'+support.cssCursorValue.zoomIn+';\
					}\
					.pv-gallery-sidebar-container {\
						position: absolute;\
						background-color:rgba(0,0,0,0.96);\
						padding:10px;\
						border:none;\
						margin:none;\
						-o-user-select: none;\
						-webkit-user-select: none;\
						-moz-user-select: -moz-none;\
						user-select: none;\
					}\
					.pv-gallery-sidebar-container-h {\
						height: '+ prefs.gallery.sidebarSize +'px;\
						width: 100%;\
					}\
					.pv-gallery-sidebar-container-v {\
						width: '+ prefs.gallery.sidebarSize +'px;\
						height: 100%;\
					}\
					.pv-gallery-sidebar-container-top {\
						top: 0;\
						left: 0;\
						border-bottom:1px solid #333333;\
					}\
					.pv-gallery-sidebar-container-right {\
						top: 0;\
						right: 0;\
						border-left:1px solid #333333;\
					}\
					.pv-gallery-sidebar-container-bottom {\
						bottom: 0;\
						left: 0;\
						border-top:1px solid #333333;\
					}\
					.pv-gallery-sidebar-container-left {\
						top: 0;\
						left: 0;\
						border-right:1px solid #333333;\
					}\
					.pv-gallery-sidebar-content {\
						display: block;\
						margin: 0;\
						padding: 0;\
						border: 0;\
						background-clip: padding-box;\
						position: relative;\
					}\
					.pv-gallery-sidebar-content-h {\
						height: 100%;\
						width: 90%;\
						margin-left: auto;\
						margin-right: auto;\
						border-left: 40px solid transparent;\
						border-right: 40px solid transparent;\
					}\
					.pv-gallery-sidebar-content-v {\
						height: 90%;\
						width: 100%;\
						top: 5%;\
						border-top: 40px solid transparent;\
						border-bottom: 40px solid transparent;\
					}\
					.pv-gallery-sidebar-controler{\
						cursor:pointer;\
						position:absolute;\
						background:rgba(255,255,255,0.1) no-repeat center;\
					}\
					.pv-gallery-sidebar-controler-pre-h,\
					.pv-gallery-sidebar-controler-next-h{\
						top:2px;\
						width:36px;\
						height:100%;\
					}\
					.pv-gallery-sidebar-controler-pre-v,\
					.pv-gallery-sidebar-controler-next-v{\
						left:2px;\
						width:100%;\
						height:36px;\
					}\
					.pv-gallery-sidebar-controler-pre-h {\
						left: -40px;\
						background-image: url("'+prefs.icons.arrowLeft+'");\
					}\
					.pv-gallery-sidebar-controler-next-h {\
						right: -40px;\
						background-image: url("'+prefs.icons.arrowRight+'");\
					}\
					.pv-gallery-sidebar-controler-pre-h:hover{\
						box-shadow:inset 22px 0 0 rgba(255,255,255,0.2) ,inset -14px 0 0 rgba(0,0,0,0.2);\
					}\
					.pv-gallery-sidebar-controler-next-h:hover{\
						box-shadow:inset -22px 0 0 rgba(255,255,255,0.2),inset 14px 0 0 rgba(0,0,0,0.2);\
					}\
					.pv-gallery-sidebar-controler-pre-v {\
						top: -40px;\
						background-image: url("'+prefs.icons.arrowTop+'");\
					}\
					.pv-gallery-sidebar-controler-next-v {\
						bottom: -40px;\
						background-image: url("'+prefs.icons.arrowBottom+'");\
					}\
					.pv-gallery-sidebar-controler-pre-v:hover{\
						box-shadow:inset 0 22px 0 rgba(255,255,255,0.2) ,inset 0 -14px 0 rgba(0,0,0,0.2);\
					}\
					.pv-gallery-sidebar-controler-next-v:hover{\
						box-shadow:inset 0 -22px 0 rgba(255,255,255,0.2),inset 0 14px 0 rgba(0,0,0,0.2);\
					}\
					.pv-gallery-sidebar-thumbnails-container {\
						display: block;\
						overflow: hidden;\
						height: 100%;\
						width: 100%;\
						margin:0;\
						border:none;\
						padding:0;\
					}\
					.pv-gallery-sidebar-thumbnails-container-top {\
						padding-bottom:5px;\
					}\
					.pv-gallery-sidebar-thumbnails-container-right {\
						padding-left:5px;\
					}\
					.pv-gallery-sidebar-thumbnails-container-bottom {\
						padding-top:5px;\
					}\
					.pv-gallery-sidebar-thumbnails-container-left {\
						padding-right:5px;\
					}\
					.pv-gallery-sidebar-thumbnails {\
						position:relative;\
						display: block;\
						padding: 0;\
						margin: 0;\
						border: none;\
						line-height:0;/*竖列时消除inline-block元素的行高*/\
					}\
					.pv-gallery-sidebar-thumbnails-h {\
						height: 100%;\
					}\
					.pv-gallery-sidebar-thumbnails-v {\
						width: 100%;\
					}\
					.pv-gallery-sidebar-thumb-container {\
						display:inline-block;\
						text-align: center;\
						border:2px solid rgb(52,52,52);\
						cursor:pointer;\
						position:relative;\
						padding:2px;\
						font-size:0;\
						line-height:0;\
						/*强制图片后面作为vertical-align参考的字符不换行，以防vertical-align:middle达不到预期效果*/\
						white-space:nowrap;\
					}\
					.pv-gallery-sidebar-container-h  .pv-gallery-sidebar-thumb-container {\
						margin:0 3px 0 0;\
						height:100%;\
					}\
					.pv-gallery-sidebar-container-v .pv-gallery-sidebar-thumb-container {\
						margin:0 0 3px 0;\
						width:100%;\
					}\
					.pv-gallery-sidebar-thumb-container:hover {\
						border:2px solid rgb(57,149,211);\
					}\
					.pv-gallery-sidebar-thumb_selected {\
						border:2px solid rgb(229,59,62);\
					}\
					.pv-gallery-sidebar-thumb_selected-top {\
						bottom:-5px;\
					}\
					.pv-gallery-sidebar-thumb_selected-right {\
						left:-5px;\
					}\
					.pv-gallery-sidebar-thumb_selected-bottom {\
						top:-5px;\
					}\
					.pv-gallery-sidebar-thumb_selected-left {\
						right:-5px;\
					}\
					.pv-gallery-sidebar-thumb-loading{\
						position:absolute;\
						top:0;\
						left:0;\
						text-align:center;\
						width:100%;\
						height:100%;\
						display:none;\
						opacity:0.6;\
						background:black url("'+ prefs.icons.loading + '") no-repeat center ;\
					}\
					.pv-gallery-sidebar-thumb-loading_error{\
						cursor:pointer;\
						background-image:url("'+ prefs.icons.retry + '");\
					}\
					.pv-gallery-sidebar-thumb-loading_error::after{\
						content:"加载失败";\
						line-height: 30px;\
						color: red;\
						font-size: 14px;\
						display:inline-block;\
					}\
					.pv-gallery-sidebar-thumb-loading:hover{\
						opacity:0.8;\
					}\
					.pv-gallery-sidebar-thumb {\
						display: inline-block;\
						vertical-align: middle;\
					}\
					.pv-gallery-vertical-align-helper{\
						display:inline-block;\
						vertical-align:middle;\
						width:0;\
						height:100%;\
						margin:0;\
						border:0;\
						padding:0;\
						visibility:hidden;\
						white-space:nowrap;\
					}\
				';
				var head=document.querySelector('head');
				head.appendChild(style);
				this.globalSSheet=style.sheet;

				var style2=document.createElement('style');
				this.thumbVisibleStyle=style2;
				style2.type='text/css';
				head.appendChild(style2);
			},
		};

		GalleryC.prototype.Preload.prototype={//预读对象
			container:(function(){
				var div=document.createElement('div');
				div.className='pv-gallery-preloaded-img-container';
				div.style.display='none';
				document.body.appendChild(div);
				return div;
			})(),
			init:function(){
				this.max=prefs.gallery.max;
				this.nextNumber=0;
				this.nextEle=this.ele;
				this.preNumber=0;
				this.preEle=this.ele;
				this.direction='pre';
			},
			preload:function(){
				var ele=this.getPreloadEle();
				if(!ele){
					//console.log('预读正常结束');
					return;
				};

				//console.log('正在预读：',ele);
				var self=this;
				this.imgReady=imgReady(ele.dataset['src'],{
					loadEnd:function(){
						if(self.aborted){
							//console.log('强制终止了');
							return;
						};
						ele.setAttribute('data-preloaded','true');
						self.container.appendChild(this);
						self.preload();
					},
					time:60 * 1000,//限时一分钟，否则强制结束并开始预读下一张。
				});
			},
			getPreloadEle:function(){
				if((this.max<=this.nextNumber && this.max<=this.preNumber) || (!this.nextEle && !this.preEle)){
					return;
				};
				var ele=this.direction=='pre'?  this.getNext() : this.getPrevious();
				if(ele && !ele.dataset['preloaded']){
					return ele;
				}else{
					return this.getPreloadEle();
				};
			},
			getNext:function(){
				this.nextNumber++;
				this.direction='next';
				if(!this.nextEle)return;

				var next;
				var _next=this.nextEle.nextElementSibling;
				while(_next){
					if(_next.clientWidth!=0){
						next=_next;
						break;
					};
					_next=_next.nextElementSibling;
				};
				this.nextEle=next;
				return next;
			},
			getPrevious:function(){
				this.preNumber++;
				this.direction='pre';
				if(!this.preEle)return;

				var pre;
				var _pre=this.preEle.previousElementSibling;
				while(_pre){
					if(_pre.clientWidth!=0){
						pre=_pre;
						break;
					};
					_pre=_pre.previousElementSibling;
				};
				this.preEle=pre;
				return pre;
			},
			abort:function(){
				this.aborted=true;
				if(this.imgReady){
					this.imgReady.abort();
				};
			},
		};

		GalleryC.prototype.Scrollbar.prototype={//滚动条对象
			init:function(){
				var bar=this.scrollbar.bar;
				this.shown=bar.offsetWidth!=0;
				var self=this;
				bar.addEventListener('mousedown',function(e){//点击滚动条区域，该干点什么！
					e.preventDefault();
					var target=e.target;
					var handle=self.scrollbar.handle;
					var track=self.scrollbar.track;
					switch(target){
						case handle:{//手柄；功能，拖动手柄来滚动窗口
							var pro=self.isHorizontal ? ['left','clientX'] : ['top','clientY'];
							var oHOffset=parseFloat(handle.style[pro[0]]);
							var oClient=e[pro[1]];

							var moveHandler=function(e){
								self.scroll(oHOffset + e[pro[1]] - oClient,true);
							};
							var upHandler=function(){
								document.removeEventListener('mousemove',moveHandler,true);
								document.removeEventListener('mouseup',upHandler,true);
							};
							document.addEventListener('mousemove',moveHandler,true);
							document.addEventListener('mouseup',upHandler,true);
						}break;
						case track:{//轨道；功能，按住不放来连续滚动一个页面的距离
							var pro=self.isHorizontal ? ['left','offsetX','layerX','clientWidth','offsetWidth'] : ['top' , 'offsetY' ,'layerY','clientHeight','offsetHeight'];
							var clickOffset=typeof e[pro[1]]=='undefined' ?  e[pro[2]] : e[pro[1]];
							var handleOffset=parseFloat(handle.style[pro[0]]);
							var handleSize=handle[pro[4]];
							var under= clickOffset > handleOffset ;//点击在滚动手柄的下方
							var containerSize=self.container[pro[3]];

							var scroll=function(){
								self.scrollBy(under?  (containerSize - 10) : (-containerSize + 10));//滚动一个页面距离少一点
							};
							scroll();

							var checkStop=function(){//当手柄到达点击位置时停止
								var handleOffset=parseFloat(handle.style[pro[0]]);
								if(clickOffset >= handleOffset && clickOffset <= (handleOffset + handleSize)){
									clearTimeout(scrollTimeout);
									clearInterval(scrollInterval);
								};
							};


							var scrollInterval;
							var scrollTimeout=setTimeout(function(){
								scroll();
								scrollInterval=setInterval(function(){
									scroll();
									checkStop();
								},120);
								checkStop();
							},300);


							checkStop();

							var upHandler=function(){
								clearTimeout(scrollTimeout);
								clearInterval(scrollInterval);
								document.removeEventListener('mouseup',upHandler,true);
							};
							document.addEventListener('mouseup',upHandler,true);
						}break;
					};
					
				},true);
			},
			reset:function(){//判断滚动条该显示还是隐藏

				var pro=this.isHorizontal ? ['offsetWidth','clientWidth','width','clientWidth'] : ['offsetHeight','clientHeight','height','clientHeight'];

				//如果内容大于容器的content区域
				var contentSize=this.content[pro[0]];
				var containerSize=this.container[pro[1]];
				if(contentSize > containerSize){
					this.show();
					var trackSize=this.scrollbar.track[pro[3]];
					this.trackSize=trackSize;
					var handleSize=Math.floor((containerSize/contentSize) * trackSize);
					handleSize=Math.max(20,handleSize);//限制手柄的最小大小;
					this.handleSize=handleSize;
					this.one=(trackSize-handleSize) / (contentSize-containerSize);//一个像素对应的滚动条长度
					this.scrollbar.handle.style[pro[2]]= handleSize + 'px';
					this.scroll(this.getScrolled());
				}else{
					this.hide();
				};
			},
			show:function(){
				if(this.shown)return;
				this.shown=true;
				this.scrollbar.bar.style.display='block';
			},
			hide:function(){
				if(!this.shown)return;
				this.shown=false;
				this.scrollbar.bar.style.display='none';
			},
			scrollBy:function(distance,handleDistance){
				this.scroll(this.getScrolled() + (handleDistance?  distance / this.one :  distance));
			},
			scrollByPage:function(num){
				this.scroll(this.getScrolled() + (this.container[(this.isHorizontal ? 'clientWidth' : 'clientHeight')] - 10) * num);
			},
			scroll:function(distance,handleDistance){
				if(!this.shown)return;

				var pro;

				//滚动实际滚动条
				var _distance=distance;
				_distance=handleDistance?  distance / this.one :  distance;
				if(this.isHorizontal){
					pro='left';
					this.container.scrollLeft=_distance;
				}else{
					pro='top';
					this.container.scrollTop=_distance;
				};

				//滚动虚拟滚动条
				//根据比例转换为滚动条上应该滚动的距离。
				distance=handleDistance? distance : this.one * distance;
				//处理非法值
				distance=Math.max(0,distance);//如果值小于0那么取0
				distance=Math.min(distance,this.trackSize - this.handleSize);//大于极限值，取极限值
				this.scrollbar.handle.style[pro]=distance + 'px';
			},
			getScrolled:function(){
				if(this.isHorizontal){
					return this.container.scrollLeft;
				}else{
					return this.container.scrollTop;
				};
			},
		};


		//放大镜
		function MagnifierC(img,data){
			this.img=img;
			this.data=data;
			this.init();
		};

		MagnifierC.all=[];
		MagnifierC.styleZIndex=900000000;//全局z-index;
		MagnifierC.zoomRange=prefs.magnifier.wheelZoom.range.slice(0).sort();//升序
		MagnifierC.zoomRangeR=MagnifierC.zoomRange.slice(0).reverse();//降序

		MagnifierC.prototype={
			init:function(){
				this.addStyle();
				MagnifierC.all.push(this);
				var container=document.createElement('span');

				container.className='pv-magnifier-container';
				document.body.appendChild(container);

				this.magnifier=container;

				var imgNaturalSize={
					h:this.img.naturalHeight,
					w:this.img.naturalWidth,
				};

				this.imgNaturalSize=imgNaturalSize;

				var cs=container.style;
				cs.zIndex=MagnifierC.styleZIndex++;



				var maxDia=Math.ceil(Math.sqrt(Math.pow(1/2*imgNaturalSize.w,2) + Math.pow(1/2*imgNaturalSize.h,2)) * 2);
				this.maxDia=maxDia;

				var radius=prefs.magnifier.radius;
				radius=Math.min(maxDia/2,radius);
				this.radius=radius;
				var diameter=radius * 2;
				this.diameter=diameter;

				cs.width=diameter + 'px';
				cs.height=diameter + 'px';
				cs.borderRadius=radius+1 + 'px';
				cs.backgroundImage='url("'+ this.img.src +'")';
				cs.marginLeft= -radius +'px';
				cs.marginTop= -radius +'px';

				var imgPos=getTargetPosition(this.data.img);
				var imgRange={//图片所在范围
					x:[imgPos.left , imgPos.right],
					y:[imgPos.top , imgPos.bottom],
				};
				var imgW=imgRange.x[1] - imgRange.x[0];
				var imgH=imgRange.y[1] - imgRange.y[0];
				//如果图片太小的话，进行范围扩大。
				var minSize=60;
				if(imgW < minSize){
					imgRange.x[1] +=(minSize - imgW)/2;
					imgRange.x[0] -=(minSize - imgW)/2;
					imgW=minSize;
				};
				if(imgH < minSize){
					imgRange.y[1] +=(minSize - imgH)/2;
					imgRange.y[0] -=(minSize - imgH)/2;
					imgH=minSize;
				};
				this.imgSize={
					w:imgW,
					h:imgH,
				};
				this.imgRange=imgRange;
				//console.log(this.imgRange,this.imgSize);

				this.setMouseRange();


				this.move({
					pageX:imgRange.x[0],
					pageY:imgRange.y[0],
				});

				this._focus=this.focus.bind(this);
				this._blur=this.blur.bind(this);
				this._move=this.move.bind(this);
				this._remove=this.remove.bind(this);
				this._pause=this.pause.bind(this);
				this._zoom=this.zoom.bind(this);

				if(prefs.magnifier.wheelZoom.enabled){
					this.zoomLevel=1;
					this.defaultDia=diameter;
					addWheelEvent(container,this._zoom,false);
				};

				container.addEventListener('mouseover',this._focus,false);
				container.addEventListener('mouseout',this._blur,false);
				container.addEventListener('dblclick',this._remove,false);
				container.addEventListener('click',this._pause,false);


				document.addEventListener('mousemove',this._move,true);
			},
			addStyle:function(){
				if(MagnifierC.style)return;
				var style=document.createElement('style');
				style.type='text/css';
				MagnifierC.style=style;
				style.textContent='\
					.pv-magnifier-container{\
						position:absolute;\
						padding:0;\
						margin:0;\
						background-origin:border-box;\
						-moz-box-sizing:border-box;\
						box-sizing:border-box;\
						border:3px solid #CCCCCC;\
						background:rgba(40, 40, 40, 0.9) no-repeat;\
					}\
					.pv-magnifier-container_focus{\
						box-shadow: 0px 0px 6px rgba(0, 0, 0, 0.7);\
					}\
					.pv-magnifier-container_pause{\
						border-color:red;\
					}\
				';
				document.querySelector('head').appendChild(style);
			},
			focus:function(){
				this.magnifier.classList.add('pv-magnifier-container_focus');
				this.magnifier.style.zIndex=MagnifierC.styleZIndex++;
			},
			blur:function(){
				this.magnifier.classList.remove('pv-magnifier-container_focus');
			},
			move:function(e){
				var mouseCoor={
					x:e.pageX,
					y:e.pageY,
				};
				var mouseRange=this.mouseRange;
				var imgRange=this.imgRange;

				if( !(mouseCoor.x >= mouseRange.x[0] && mouseCoor.x <= mouseRange.x[1] && mouseCoor.y >= mouseRange.y[0] && mouseCoor.y <= mouseRange.y[1]))return;//如果不再鼠标范围
				if(mouseCoor.x > imgRange.x[1]){
					mouseCoor.x = imgRange.x[1];
				}else if(mouseCoor.x < imgRange.x[0]){
					mouseCoor.x = imgRange.x[0];
				};
				if(mouseCoor.y > imgRange.y[1]){
					mouseCoor.y = imgRange.y[1];
				}else if(mouseCoor.y < imgRange.y[0]){
					mouseCoor.y = imgRange.y[0];
				};

				var ms=this.magnifier.style;
				ms.top= mouseCoor.y + 'px';
				ms.left= mouseCoor.x + 'px';

				var radius=this.radius;
				var imgSize=this.imgSize;
				var imgNaturalSize=this.imgNaturalSize;
				var px=-((mouseCoor.x-imgRange.x[0])/imgSize.w * imgNaturalSize.w) + radius +'px';
				var py=-((mouseCoor.y-imgRange.y[0])/imgSize.h * imgNaturalSize.h) + radius +'px';
				//console.log(px,py);
				ms.backgroundPosition=px + ' ' + py;
			},
			getNextZoomLevel:function(){
				var level;
				var self=this;
				if(this.zoomOut){//缩小
					MagnifierC.zoomRangeR._find(function(value){
						if(value < self.zoomLevel){
							level=value;
							return true;
						}
					})
				}else{
					MagnifierC.zoomRange._find(function(value){
						if(value > self.zoomLevel){
							level=value;
							return true;
						};
					});
				}
				return level;
			},
			zoom:function(e){
				if(e.deltaY===0)return;//非Y轴的滚动
				if(prefs.magnifier.wheelZoom.pauseFirst && !this.paused)return;
				e.preventDefault();
				if(e.deltaY < 0){//向上滚，放大；
					if(this.diameter >= this.maxDia)return;
					this.zoomOut=false;
				}else{
					this.zoomOut=true;
				};
				var level=this.getNextZoomLevel();
				if(!level)return;

				this.zoomLevel=level;
				var diameter=this.defaultDia * level;
				if(diameter > this.maxDia){
					diameter = this.maxDia;
				};

				var radius=diameter/2
				this.diameter=diameter;
				var bRadius=this.radius;
				this.radius=radius;
				this.setMouseRange();
				var ms=this.magnifier.style;
				ms.width=diameter+'px';
				ms.height=diameter+'px';
				ms.borderRadius=radius+1 + 'px';
				ms.marginLeft=-radius+'px';
				ms.marginTop=-radius+'px';
				var bBP=ms.backgroundPosition.split(' ');
				ms.backgroundPosition=parseFloat(bBP[0]) + (radius - bRadius) + 'px' + ' ' + (parseFloat(bBP[1]) + ( radius - bRadius) + 'px');

			},
			pause:function(){
				if(this.paused){
					this.magnifier.classList.remove('pv-magnifier-container_pause');
					document.addEventListener('mousemove',this._move,true);
				}else{
					this.magnifier.classList.add('pv-magnifier-container_pause');
					document.removeEventListener('mousemove',this._move,true);
				};
				this.paused=!this.paused;
			},
			setMouseRange:function(){
				var imgRange=this.imgRange;
				var radius=this.radius;
				this.mouseRange={//鼠标活动范围
					x:[imgRange.x[0]-radius , imgRange.x[1] + radius],
					y:[imgRange.y[0]-radius , imgRange.y[1] + radius],
				};
			},
			remove:function(){
				this.magnifier.parentNode.removeChild(this.magnifier);
				document.removeEventListener('mousemove',this._move,true);
				MagnifierC.all.splice(MagnifierC.all.indexOf(this),1);
			},
		};



		//图片窗口
		function ImgWindowC(img){
			this.img=img;
			this.src=img.src;
			this.init();
		};

		ImgWindowC.styleZIndex=1000000000;//全局z-index;
		ImgWindowC.all=[];//所有的窗口对象
		ImgWindowC.zoomRange=prefs.imgWindow.zoom.range.slice(0).sort();//升序
		ImgWindowC.zoomRangeR=ImgWindowC.zoomRange.slice(0).reverse();//降序


		ImgWindowC.prototype={
			init:function(){
				var self=this;
				//图片是否已经被打开
				if(ImgWindowC.all._find(function(iwin){
					if(iwin.src==self.src){
						iwin.firstOpen();
						return true;
					};
				}))return;

				this.addStyle();
				this.addRotateIndicator();

				var img=this.img;
				img.className='pv-pic-window-pic pv-pic-not-allowed';
				img.style.cssText='\
					top:0px;\
					left:0px;\
				';

				var imgNaturalSize={
					h:img.naturalHeight,
					w:img.naturalWidth,
				};
				this.imgNaturalSize=imgNaturalSize;

				var container=document.createElement('span');
				container.style.cssText='\
					cursor:pointer;\
					top:0px;\
					left:0px;\
				';
				container.className='pv-pic-window-container';
				container.innerHTML=
									'<span class="pv-pic-window-toolbar">'+
										'<span class="pv-pic-window-tb-hand pv-pic-window-tb-tool pv-pic-window-tb-tool-selected" title="抓手"></span>'+
										'<span class="pv-pic-window-tb-tool-badge-container">'+
											'<span class="pv-pic-window-tb-rotate pv-pic-window-tb-tool" title="旋转"></span>'+
											'<span class="pv-pic-window-tb-tool-badge">0</span>'+
										'</span>'+
										'<span class="pv-pic-window-tb-tool-badge-container">'+
											'<span class="pv-pic-window-tb-zoom pv-pic-window-tb-tool" title="缩放"></span>'+
											'<span class="pv-pic-window-tb-tool-badge">0</span>'+
										'</span>'+
										'<span class="pv-pic-window-tb-flip-horizontal pv-pic-window-tb-command" title="水平翻转"></span>'+
										'<span class="pv-pic-window-tb-flip-vertical pv-pic-window-tb-command" title="垂直翻转"></span>'+
									'</span>'+
									'<span class="pv-pic-window-close"></span>'+
									'<span class="pv-pic-window-range"></span>';

				container.insertBefore(img,container.firstChild);

				this.imgWindow=container;

				var toolMap={
					'hand':container.querySelector('.pv-pic-window-tb-hand'),
					'rotate':container.querySelector('.pv-pic-window-tb-rotate'),
					'zoom':container.querySelector('.pv-pic-window-tb-zoom'),
					'fh':container.querySelector('.pv-pic-window-tb-flip-horizontal'),
					'fv':container.querySelector('.pv-pic-window-tb-flip-vertical'),
				};
				this.toolMap=toolMap;

				this.viewRange=container.querySelector('.pv-pic-window-range');




				//关闭
				var closeButton=container.querySelector('.pv-pic-window-close');
				closeButton.style.cssText='\
					top: -24px;\
					right: 0px;\
				';
				this.closeButton=closeButton;

				closeButton.addEventListener('click',function(e){
					self.remove();
				},false);

				var toolbar=container.querySelector('.pv-pic-window-toolbar');
				toolbar.style.cssText='\
					top: 0px;\
					left: -45px;\
				';
				this.toolbar=toolbar;

				this.selectedTool='hand';
				this.cursor='hand';
				this.selectedToolClass='pv-pic-window-tb-tool-selected';
				


				this.hKeyUp=true;
				this.rKeyUp=true;
				this.zKeyUp=true;

				this.spaceKeyUp=true;
				this.ctrlKeyUp=true;
				this.altKeyUp=true;
				this.shiftKeyUp=true;


				toolbar.addEventListener('mousedown',function(e){//鼠标按下选择工具
					self.toolbarEventHandler(e);
				},false);


				toolbar.addEventListener('dblclick',function(e){//鼠标双击工具
					self.toolbarEventHandler(e);
				},false);


				//阻止浏览器对图片的默认控制行为
				img.addEventListener('mousedown',function(e){
					e.preventDefault();
				},false);


				container.addEventListener('mousedown',function(e){//当按下的时，执行平移，缩放，旋转操作
					self.imgWindowEventHandler(e);
				},false);

				container.addEventListener('click',function(e){//阻止opera ctrl+点击保存图片
					self.imgWindowEventHandler(e);
				},false);

				if(prefs.imgWindow.zoom.mouseWheelZoom){//是否使用鼠标缩放
					addWheelEvent(container,function(e){//滚轮缩放
						self.imgWindowEventHandler(e);
					},false);
				};


				if(prefs.imgWindow.overlayer.shown){//是否显示覆盖层
					var overlayer=document.createElement('span');
					this.overlayer=overlayer;
					overlayer.className='pv-pic-window-overlayer';
					overlayer.style.backgroundColor=prefs.imgWindow.overlayer.color;
					document.body.appendChild(overlayer);
				};

				//是否点击图片外部关闭
				if(prefs.imgWindow.clickOutsideToClose.enabled){
					var clickOutsideToClose=function(e){
						var target=e.target;
						if(!container.contains(target)){
							document.removeEventListener(prefs.imgWindow.clickOutsideToClose.trigger,clickOutsideToClose,true);
							self.remove();
						};
					};
					document.addEventListener(prefs.imgWindow.clickOutsideToClose.trigger,clickOutsideToClose,true);
				};

				document.body.appendChild(container);
				ImgWindowC.all.push(this);

				this._blur=this.blur.bind(this);
				this._focusedKeydown=this.focusedKeydown.bind(this);
				this._focusedKeyup=this.focusedKeyup.bind(this);

				this.rotatedRadians=0;//已经旋转的角度
				this.zoomLevel=1;//缩放级别
				this.setToolBadge('zoom',1);

				//选中默认工具
				this.selectTool(prefs.imgWindow.defaultTool);

				this.firstOpen();
			},
			firstOpen:function(){
				this.focus();
				var imgWindow=this.imgWindow;
				imgWindow.style.left=-5 + window.scrollX + 'px';
				imgWindow.style.top=-5 + window.scrollY + 'px';

				if(prefs.imgWindow.fitToScreen){
					this.fitToScreen();
					this.center(true,true);
				}else{
					//window的尺寸
					var wSize=getWindowSize();
					//空隙
					wSize.h -= 16;
					wSize.w -= 16;

					var imgWindowCS=getComputedStyle(imgWindow,null);

					var rectSize={
						h:parseFloat(imgWindowCS.height),
						w:parseFloat(imgWindowCS.width),
					};

					this.center(rectSize.w <= wSize.w , rectSize.h <= wSize.h);
				};

				this.keepScreenInside();
			},
			addStyle:function(){
				if(ImgWindowC.style)return;
				var style=document.createElement('style');
				ImgWindowC.style=style;
				style.textContent='\
					.pv-pic-window-container {\
						position: absolute;\
						background-color: rgba(40,40,40,0.9);\
						padding: 8px;\
						border: 5px solid #ccc;\
						line-height: 0;\
						text-align: left;\
					}\
					.pv-pic-window-container_focus {\
						box-shadow: 0 0 10px rgba(0,0,0,0.6);\
					}\
					.pv-pic-window-close, .pv-pic-window-toolbar {\
						-webkit-transition: opacity 0.2s ease-in-out;\
						transition: opacity 0.2s ease-in-out;\
					}\
					.pv-pic-window-toolbar {\
						position: absolute;\
						background-color: #535353;\
						padding: 0;\
						opacity: 0.9;\
						display: none;\
						cursor: default;\
					}\
					.pv-pic-window-toolbar:hover {\
						opacity: 1;\
					}\
					.pv-pic-window-toolbar_focus {\
						display: block;\
					}\
					.pv-pic-window-close {\
						cursor: pointer;\
						position: absolute;\
						right: 0px;\
						top: -24px;\
						background: url("'+prefs.icons.close+'") no-repeat center bottom;\
						height: 17px;\
						width: 46px;\
						opacity: 0.9;\
						border:none;\
						padding:0;\
						padding-top:2px;\
						background-color:#1771FF;\
						display: none;\
					}\
					.pv-pic-window-close:hover {\
						background-color:red;\
						opacity: 1;\
					}\
					.pv-pic-window-close_focus {\
						display: block;\
					}\
					.pv-pic-window-pic {\
						position: relative;\
						display:inline-block;\/*opera把图片设置display:block会出现渲染问题，会有残影，还会引发其他各种问题，吓尿*/\
						max-width:none;\
						min-width:none;\
						max-height:none;\
						min-height:none;\
						padding:0;\
						margin:0;\
					}\
					.pv-pic-window-pic_focus {\
						box-shadow: 0 0 6px black;\
					}\
					.pv-pic-window-tb-tool, .pv-pic-window-tb-command{\
						height: 24px;\
						width: 24px;\
						padding: 12px 8px 6px 6px;\
						margin:0;\
						display: block;\
						background: transparent no-repeat center;\
						cursor: pointer;\
						position: relative;\
						border: none;\
						border-left: 2px solid transparent;\
						border-bottom: 1px solid #868686;\
						background-origin: content-box;\
					}\
					.pv-pic-window-toolbar > span:last-child {\
						border-bottom: none;\
					}\
					.pv-pic-window-tb-tool:hover, .pv-pic-window-tb-command:hover{\
						border-left: 2px solid red;\
					}\
					.pv-pic-window-tb-tool-selected{\
						box-shadow: inset 0 21px 0 rgba(255,255,255,0.3) ,inset 0 -21px 0 rgba(0,0,0,0.3);\
						border-left:2px solid #1771FF;\
					}\
					.pv-pic-window-tb-hand {\
						background-image: url("'+prefs.icons.hand+'");\
					}\
					.pv-pic-window-tb-rotate {\
						background-image: url("'+prefs.icons.rotate+'");\
					}\
					.pv-pic-window-tb-zoom {\
						background-image: url("'+prefs.icons.zoom+'");\
					}\
					.pv-pic-window-tb-flip-horizontal {\
						background-image: url("'+prefs.icons.flipHorizontal+'");\
					}\
					.pv-pic-window-tb-flip-vertical {\
						background-image: url("'+prefs.icons.flipVertical+'");\
					}\
					.pv-pic-window-tb-tool-badge-container {\
						display: block;\
						position: relative;\
					}\
					.pv-pic-window-tb-tool-badge {\
						position: absolute;\
						top: -3px;\
						right: 1px;\
						font-size: 10px;\
						line-height: 1.5;\
						padding: 0 3px;\
						background-color: #F93;\
						border-radius: 50px;\
						opacity: 0.5;\
						color: black;\
					}\
					.pv-pic-window-overlayer{\
						height:100%;\
						width:100%;\
						position:fixed;\
						z-index:999999999;\
						top:0;\
						left:0;\
					}\
					.pv-pic-window-rotate-indicator{\
						cursor: progress;\
						position:absolute;\
						z-index:1100000000;\
						width:250px;\
						height:250px;\
						padding:10px;\
						margin-top:-135px;\
						margin-left:-135px;\
						background:transparent url("'+ prefs.icons.rotateIndicatorBG +'") no-repeat center;\
					}\
					.pv-pic-window-rotate-indicator-pointer{\
						display:block;\
						margin-left:auto;\
						margin-right:auto;\
						background:transparent url("'+ prefs.icons.rotateIndicatorPointer +'") no-repeat center;\
						width:60px;\
						height:240px;\
						position:relative;\
						top:5px;\
					}\
					.pv-pic-window-range{\
						position:absolute;\
						border:none;\
						width:100px;\
						height:100px;\
						box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.8);\
						display:none;\
						padding:0;\
						background-color:rgba(255, 0, 0, 0.150);\
					}\
				';
				document.querySelector('head').appendChild(style);
			},
			addRotateIndicator:function(){
				if(ImgWindowC.rotateIndicator)return;
				var rotateIndicator=document.createElement('span');
				rotateIndicator.className='pv-pic-window-rotate-indicator';
				ImgWindowC.rotateIndicator=rotateIndicator;
				rotateIndicator.style.cssText='\
					display:none;\
				';
				var rotateIndicatorPointer=document.createElement('span');
				rotateIndicatorPointer.className='pv-pic-window-rotate-indicator-pointer';
				ImgWindowC.rotateIndicatorPointer=rotateIndicatorPointer;
				rotateIndicator.appendChild(rotateIndicatorPointer);
				document.body.appendChild(rotateIndicator);
			},
			keepScreenInside:function(){//保持按钮在屏幕里面.
				var imgWindow=this.imgWindow;
				var imgWindowFullSize={
					h:imgWindow.offsetHeight,
					w:imgWindow.offsetWidth,
				};

				var windowSize=getWindowSize();

				function keepSI(obj,offsetDirection,defaultValue){
					var objRect=obj.getBoundingClientRect();
					var objStyle=obj.style;

					while(offsetDirection.length){
						var oD=offsetDirection[0];
						var oDV=defaultValue[0];
						offsetDirection.shift();
						defaultValue.shift();
						var oValue=parseFloat(objStyle[oD]);
						var newValue;
						switch(oD){
							case 'top':{
								newValue=oValue - objRect.top;
								if(objRect.top<0){
									newValue=Math.min(newValue,imgWindowFullSize.h);
								}else{
									newValue=Math.max(newValue,oDV);
								};
							}break;
							case 'right':{
								newValue=oValue + (objRect.right - windowSize.w);
								if(objRect.right > windowSize.w){//屏幕外
									newValue=Math.min(newValue,imgWindowFullSize.w);
								}else{
									newValue=Math.max(newValue,oDV);
								};
							}break;
							case 'bottom':{
								newValue=oValue + (objRect.bottom - windowSize.h);
								if(objRect.bottom > windowSize.h){//屏幕外
									newValue=Math.min(newValue,imgWindowFullSize.h);
								}else{
									newValue=Math.max(newValue,oDV);
								};
							}break;
							case 'left':{
								newValue=oValue - objRect.left;
								if(objRect.left<0){
									newValue=Math.min(newValue,imgWindowFullSize.w);
								}else{
									newValue=Math.max(newValue,oDV);
								}
							}break;
						};
						//console.log(newValue);
						objStyle[oD]=newValue + 'px';
						
					};
				};

				keepSI(this.closeButton,['top','right'],[-24,0]);
				keepSI(this.toolbar,['top','left'],[0,-45]);
			},
			fitToScreen:function(){
				var wSize=getWindowSize();
				//空隙
				wSize.h -= 16;
				wSize.w -= 16;

				var imgWindow=this.imgWindow;
				var imgWindowCS=getComputedStyle(imgWindow,null);
				var rectSize={
					h:parseFloat(imgWindowCS.height),
					w:parseFloat(imgWindowCS.width),
				};


				var size;
				if(rectSize.w - wSize.w>0 || rectSize.h - wSize.h>0){//超出屏幕，那么缩小。
					if(rectSize.w/rectSize.h > wSize.w/wSize.h){
						size={
							w:wSize.w,
							h:wSize.w / (rectSize.w/rectSize.h),
						};
					}else{
						size={
							h:wSize.h,
							w:wSize.h * (rectSize.w/rectSize.h),
						}
					};

					this.zoom(this.getRotatedImgCliSize(size).w/this.imgNaturalSize.w);
				};
			},
			center:function(horizontal,vertical){
				if(!horizontal && !vertical)return;
				var wSize=getWindowSize();
				var imgWindow=this.imgWindow;
				if(horizontal)imgWindow.style.left= (wSize.w - imgWindow.offsetWidth)/2 + window.scrollX +'px';
				if(vertical)imgWindow.style.top= (wSize.h - imgWindow.offsetHeight)/2 + window.scrollY +'px';
			},
			move:function(e){
				this.working=true;
				var mouseCoor={
					x:e.pageX,
					y:e.pageY,
				};
				var imgWindow=this.imgWindow;
				var imgWStyle=imgWindow.style;
				var oriOffset={
					left:parseFloat(imgWStyle.left),
					top:parseFloat(imgWStyle.top),
				};
				var self=this;
				var moveHandler=function(e){
					imgWStyle.left=oriOffset.left+ e.pageX-mouseCoor.x +'px';
					imgWStyle.top=oriOffset.top + e.pageY-mouseCoor.y +'px';
					self.keepScreenInside();
				};
				var mouseupHandler=function(){
					e.preventDefault();
					self.working=false;
					if(self.tempHand && self.spaceKeyUp){//如果是临时切换到抓手工具，平移完成后返回上个工具
						self.tempHand=false;
						self.changeCursor(self.selectedTool);
					};
					document.removeEventListener('mousemove',moveHandler,true);
					document.removeEventListener('mouseup',mouseupHandler,true);
				};
				document.addEventListener('mousemove',moveHandler,true);
				document.addEventListener('mouseup',mouseupHandler,true);
			},
			rotate:function(origin,topLeft){

				var img=this.img;
				var imgWindow=this.imgWindow;

				var iTransform=img.style[support.cssTransform].replace(/rotate\([^)]*\)/i,'');

				var imgWindowCS=getComputedStyle(imgWindow,null);
				var imgRectSize={
					h:parseFloat(imgWindowCS.height),
					w:parseFloat(imgWindowCS.width),
				};

				var rectOffset={
					top:parseFloat(imgWindow.style.top),
					left:parseFloat(imgWindow.style.left),
				};

				var imgSize={
					h:img.clientHeight,
					w:img.clientWidth,
				};

				var imgOffset={
					top:parseFloat(img.style.top),
					left:parseFloat(img.style.left),
				};


				var self=this;
				var PI=Math.PI;

				var rotate=function (radians){
					if(self.rotatedRadians==radians)return;
					img.style[support.cssTransform] = ' rotate('+ radians +'rad) ' + iTransform;
					ImgWindowC.rotateIndicatorPointer.style[support.cssTransform]='rotate('+ radians +'rad)';

					self.rotatedRadians=radians;
					self.setToolBadge('rotate',radians/(PI/180));

					var afterimgRectSize=self.getRotatedImgRectSize( radians, imgSize );
					imgWindow.style.width=afterimgRectSize.w +'px';
					imgWindow.style.height=afterimgRectSize.h + 'px';
					if(!topLeft)self.setImgWindowOffset(rectOffset,imgRectSize,afterimgRectSize);
					self.setImgOffset(imgOffset,imgRectSize,afterimgRectSize);
					self.keepScreenInside();
				};


				if(typeof origin=='number'){
					rotate(origin);
					return;
				};


				this.working=true;

				var lastRotatedRadians=this.rotatedRadians;
				this.shiftKeyUp=true;
				var shiftRotateStep=prefs.imgWindow.shiftRotateStep / (180/Math.PI);//转成弧度

				var moveHandler=function(e){
					var radians=lastRotatedRadians + Math.atan2( e.pageY - origin.pageY, e.pageX - origin.pageX );

					if(radians>2*PI){
						radians-=2*PI;
					}else if(radians<0){
						radians+=2*PI;
					};

					if(!self.shiftKeyUp){//如果按下了shift键，那么步进缩放
						radians -= radians % shiftRotateStep;
						radians += shiftRotateStep;
					};
					rotate(radians);
				};

				var mouseupHandler=function(){
					self.working=false;
					ImgWindowC.rotateIndicator.style.display='none';
					document.removeEventListener('mousemove',moveHandler,true);
					document.removeEventListener('mouseup',mouseupHandler,true);
				};

				document.addEventListener('mousemove',moveHandler,true);
				document.addEventListener('mouseup',mouseupHandler,true);
			},
			getNextZoomLevel:function(){
				var level;
				var self=this;
				if(this.zoomOut){//缩小
					ImgWindowC.zoomRangeR._find(function(value){
						if(value < self.zoomLevel){
							level=value;
							return true;
						}
					})
				}else{
					ImgWindowC.zoomRange._find(function(value){
						if(value > self.zoomLevel){
							level=value;
							return true;
						};
					});
				}
				return level;
			},
			getZoomRatio:function(mouseCoor){
				var ibcRect=this.img.getBoundingClientRect();
				var ratio={
					x:(mouseCoor.x-ibcRect.left)/ibcRect.width,
					y:(mouseCoor.y-ibcRect.top)/ibcRect.height,
				};
				if(ratio.x<0){
					ratio.x=0
				}else if(ratio.x>1){
					ratio.x=1
				};
				if(ratio.y<0){
					ratio.y=0
				}else if(ratio.y>1){
					ratio.y=1
				};
				return ratio;
			},
			zoom:function(e,ratio){//e可能是undefined,可能是事件对象，可能是直接的缩放级别数字
				var imgWindow=this.imgWindow;
				var imgWindowCS=getComputedStyle(imgWindow,null);
				var imgRectSize={
					h:parseFloat(imgWindowCS.height),
					w:parseFloat(imgWindowCS.width),
				};

				var rectOffset={
					top:parseFloat(imgWindow.style.top),
					left:parseFloat(imgWindow.style.left),
				};

				var img=this.img;
				var self=this;

				var zoom=function(level){//缩放到指定级别
					if(typeof level==='undefined' || level<0 || level==self.zoomLevel)return;

					var afterImgSize={
						h:self.imgNaturalSize.h * level,
						w:self.imgNaturalSize.w * level,
					};
					img.width=afterImgSize.w;
					img.height=afterImgSize.h;

					var afterimgRectSize=self.getRotatedImgRectSize( self.rotatedRadians, afterImgSize );
					imgWindow.style.width=afterimgRectSize.w +'px';
					imgWindow.style.height=afterimgRectSize.h + 'px';
					self.setImgWindowOffset(rectOffset,imgRectSize,afterimgRectSize,ratio);
					self.setImgOffset({top:0,left:0},afterImgSize,afterimgRectSize);//如果旋转了，调整偏移
					self.zoomLevel=level;
					self.setToolBadge('zoom',level);
					self.keepScreenInside();
				};

				if(typeof e!='object'){
					ratio=ratio? ratio : {
						x:1/2,
						y:1/2,
					};
					zoom(e);
					return;
				};

				this.working=true;

				ratio=this.getZoomRatio({
					x:e.clientX,
					y:e.clientY,
				});


				var moved;
				var lastPageX=e.pageX;
				var currentLevel=this.zoomLevel;
				var moveFired=0;
				var moveHandler=function(e){
					moveFired++
					if(moveFired < 2){//有时候点击的时候不小心会触发一发move
						return;
					};
					moved=true;
					var pageX=e.pageX;
					var level;
					if(pageX > lastPageX){//向右移，zoomin扩大
						self.changeCursor('zoom',false);
						level=0.05;
					}else{//向左移，zoomout缩小
						self.changeCursor('zoom',true);
						level=-0.05;
					};
					lastPageX=pageX;
					currentLevel += level;
					zoom(currentLevel);
				};

				var mouseupHandler=function(e){
					self.working=false;
					document.removeEventListener('mousemove',moveHandler,true);
					document.removeEventListener('mouseup',mouseupHandler,true);

					var level=self.getNextZoomLevel();

					if(self.zoomOut && self.altKeyUp){
						self.zoomOut=false;
					};

					if(!moved){//如果没有平移缩放。
						zoom(level);
					};

					self.changeCursor('zoom',self.zoomOut);

					if(self.tempZoom && self.ctrlKeyUp && self.altKeyUp){
						self.tempZoom=false;
						self.changeCursor(self.selectedTool);
					};

				};

				document.addEventListener('mousemove',moveHandler,true);
				document.addEventListener('mouseup',mouseupHandler,true);
			},
			convertToValidRadians:function(radians){
				//转成0-90的等价角度。
				var PI=Math.PI;
				if(radians > PI){
					radians = 2*PI - radians;
				};
				if(radians > 1/2*PI){
					radians = PI - radians;
				};
				return radians;
			},
			getRotatedImgRectSize:function( radians, imgSize ){//通过旋转后的角度和图片的大小，求虚拟矩形的大小
				imgSize= imgSize ? imgSize :{
					h:this.img.clientHeight,
					w:this.img.clentWidth,
				};

				if(typeof radians==='undefined'){
					radians = this.rotatedRadians;
				};

				radians=this.convertToValidRadians(radians);

				return {
					h:imgSize.h* Math.cos(radians) + imgSize.w * Math.sin(radians),
					w:imgSize.h* Math.sin(radians) + imgSize.w * Math.cos(radians),
				};
			},
			getRotatedImgCliSize:function(rectSize,radians){//通过虚拟矩形的大小和图片的旋转角度，求图片的大小

				if(typeof radians==='undefined'){
					radians = this.rotatedRadians;
				};

				radians=this.convertToValidRadians(radians);

				if(radians==0){
					//radians=Math.PI/180 * 1/100;
					return rectSize;
				};

				var h=(rectSize.h-rectSize.w * Math.tan(radians))/(Math.cos(radians)-Math.sin(radians)*Math.tan(radians));
				var w=(rectSize.h - h*Math.cos(radians))/Math.sin(radians);
				return {
					h:h,
					w:w,
				};

			},
			setImgOffset:function(oriOffset,bImgSize,aImgSize){
				var imgStyle=this.img.style;
				var top=Math.floor(oriOffset.top + (aImgSize.h-bImgSize.h)*1/2) + 'px';
				var left=Math.floor(oriOffset.left + (aImgSize.w-bImgSize.w)*1/2) + 'px';
				imgStyle.top= top;
				imgStyle.left= left;
			},
			setImgWindowOffset:function(oriOffset,bImgWindowSize,aImgWidnowSize,ratio){
				ratio= ratio? ratio : {x:1/2,y:1/2};
				var imgWindowStyle=this.imgWindow.style;
				var top=oriOffset.top - (aImgWidnowSize.h-bImgWindowSize.h)*ratio.y + 'px';
				var left=oriOffset.left - (aImgWidnowSize.w-bImgWindowSize.w)*ratio.x + 'px';
				imgWindowStyle.top= top;
				imgWindowStyle.left= left;
			},
			setToolBadge:function(tool,content){
				var scale=0;
				switch(tool){
					case 'zoom':{
						scale=2;
					}break;
					case 'rotate':{
						scale=1;
					}break;
					default:break;
				}
				content=typeof content=='string'? content : content.toFixed(scale);
				this.toolMap[tool].nextElementSibling.textContent=content;
			},
			changeCursor:function(tool,zoomOut){
				if(tool=='zoom'){
					tool+=zoomOut? '-out' : '-in';
				};
				if(this.cursor==tool)return;
				this.cursor=tool;
				var imgWStyle=this.imgWindow.style;
				switch(tool){
					case 'hand':{
						imgWStyle.cursor='pointer';
					}break;
					case 'zoom-in':{
						imgWStyle.cursor=support.cssCursorValue.zoomIn;
					}break;
					case 'zoom-out':{
						imgWStyle.cursor=support.cssCursorValue.zoomOut;
					}break;
					case 'rotate':{
						imgWStyle.cursor='progress';
					}break;
					case 'default':{
						imgWStyle.removeProperty('cursor');
					}break;
					default:break;
				};
			},
			blur:function(e){
				if(!this.focused)return;
				var imgWindow =this.imgWindow;
				//点击imgWinodw的外部的时候失去焦点
				if(e!==true && imgWindow.contains(e.target))return;
				imgWindow.classList.remove('pv-pic-window-container_focus');
				this.toolbar.classList.remove('pv-pic-window-toolbar_focus');
				this.closeButton.classList.remove('pv-pic-window-close_focus');
				this.img.classList.remove('pv-pic-window-pic_focus');
				document.removeEventListener('mousedown',this._blur,true);
				document.removeEventListener('keydown',this._focusedKeydown,true);
				document.removeEventListener('keyup',this._focusedKeyup,true);
				this.changeCursor('default');
				this.focused=false;
			},
			focus:function(){
				if(this.focused)return;
				this.imgWindow.classList.add('pv-pic-window-container_focus');
				this.toolbar.classList.add('pv-pic-window-toolbar_focus');
				this.closeButton.classList.add('pv-pic-window-close_focus');
				this.img.classList.add('pv-pic-window-pic_focus');
				this.imgWindow.style.zIndex= ImgWindowC.styleZIndex;
				this.zIndex=ImgWindowC.styleZIndex;
				ImgWindowC.styleZIndex ++;
				document.addEventListener('keydown',this._focusedKeydown,true);
				document.addEventListener('keyup',this._focusedKeyup,true);
				document.addEventListener('mousedown',this._blur,true);
				this.changeCursor(this.selectedTool);//还原鼠标样式。
				this.focused=true;
			},
			focusedKeyup:function(e){
				var keyCode=e.keyCode;
				var valid=[32,18,16,72,17,72,82,90,67];
				if(valid.indexOf(keyCode)==-1)return;

				e.preventDefault();

				switch(keyCode){
					case 32:{//空格键，临时切换到移动
						this.spaceKeyUp=true;
						if(!this.tempHand)return;//如果之前没有临时切换到抓手工具（当已经在工作的时候，按下空格不会临时切换到抓手工具）
						if(!this.working){//松开按键的时候，没有在继续平移了。
							this.tempHand=false;
							this.changeCursor(this.selectedTool);
						};
					}break;
					case 18:{//alt键盘切换缩小放大。
						this.altKeyUp=true;
						if(!this.zoomOut)return;
						if(!this.working){
							this.zoomOut=false;
							this.changeCursor('zoom');
							if(this.tempZoom && this.ctrlKeyUp){
								this.tempZoom=false;
								this.changeCursor(this.selectedTool);
							};
						};
					}break;
					case 16:{//shift键，旋转的时候按住shift键，步进缩放。
						this.shiftKeyUp=true;
					}break;
					case 17:{//ctrl键
						clearTimeout(this.ctrlkeyDownTimer);
						if(!this.justCKeyUp){//如果刚才没有松开c，规避划词软件的ctrl+c松开
							this.ctrlKeyUp=true;
							if(!this.tempZoom)return;//如果没有切换到了缩放
							if(!this.working && this.altKeyUp){
								this.tempZoom=false;
								this.changeCursor(this.selectedTool);
							};
						};
					}break;
					case 67:{//c键
						this.justCKeyUp=true;
						var self=this;
						clearTimeout(this.justCKeyUpTimer);
						this.justCKeyUpTimer=setTimeout(function(){
							self.justCKeyUp=false;
						},100)
					}break;
					case 72:{//h键
						this.hKeyUp=true;
					}break;
					case 82:{//r键
						this.rKeyUp=true;
					}break;
					case 90:{//z键
						this.zKeyUp=true;
					}break;
					default:break;
				};

				if([72,82,90].indexOf(keyCode)!=-1){
					if(!this.working && this.restoreBeforeTool){
						this.restoreBeforeTool=false;
						this.selectTool(this.beforeTool);
					};
				};
			},
			focusedKeydown:function(e){
				var keyCode=e.keyCode;
				var valid=[32,82,72,90,18,16,17,27,67];//有效的按键
				if(valid.indexOf(keyCode)==-1) return;

				e.preventDefault();

				if(this.working){//working的时候也可以接受按下shift键，以便旋转的时候可以任何时候按下
					if(keyCode==16){//shift键
						this.shiftKeyUp=false;
					};
					return;
				};

				switch(keyCode){
					case 82:{//r键,切换到旋转工具
						if(this.rKeyUp){
							this.rKeyUp=false;
							this.beforeTool=this.selectedTool;
							this.selectTool('rotate');
						};
					}break;
					case 72:{//h键,切换到抓手工具
						if(this.hKeyUp){
							this.hKeyUp=false;
							this.beforeTool=this.selectedTool;
							this.selectTool('hand');
						};
					}break;
					case 90:{//z键,切换到缩放工具
						if(this.zKeyUp){
							this.zKeyUp=false;
							this.beforeTool=this.selectedTool;
							this.selectTool('zoom');
						};
					}break;
					case 32:{//空格键阻止,临时切换到抓手功能
						if(this.spaceKeyUp){
							this.spaceKeyUp=false;
							if(this.selectedTool!='hand'){
								this.tempHand=true;
								this.changeCursor('hand');
							};
						};
					}break;
					case 18:{//alt键,在当前选择是缩放工具的时候，按下的时候切换到缩小功能
						if(this.altKeyUp){
							if((this.selectedTool!='zoom' && !this.tempZoom) || this.zoomOut)return;
							this.zoomOut=true;
							this.altKeyUp=false;
							this.changeCursor('zoom',true);
						};
					}break;
					case 17:{//ctrl键临时切换到缩放工具
						if(this.ctrlKeyUp){
							var self=this;
							this.ctrlkeyDownTimer=setTimeout(function(){//规避词典软件的ctrl+c，一瞬间切换到缩放的问题
								self.ctrlKeyUp=false;
								if(self.selectedTool!='zoom'){
									self.tempZoom=true;
									self.changeCursor('zoom');
								};
							},100);
						};
					}break;
					case 67:{//c键
						clearTimeout(this.ctrlkeyDownTimer);
					}break;
					case 27:{//ese关闭窗口
						this.remove();
					}break;
					default:break;
				};
			},
			toolbarEventHandler:function(e){
				e.stopPropagation();
				var target=e.target;
				var toolMap=this.toolMap;
				for(var i in toolMap){
					if(toolMap.hasOwnProperty(i) && toolMap[i]==target){
						switch(e.type){
							case 'mousedown':{
								this.selectTool(i);
							}break;
							case 'dblclick':{
								this.dblclickCommand(i);
							}break;
							default:break;
						};
						break;
					};
				};
			},
			imgWindowEventHandler:function(e){
				e.stopPropagation();
				switch(e.type){
					case 'click':{//阻止opera的图片保存
						if(e.ctrlKey && e.target.nodeName=='IMG'){
							e.preventDefault();
						};
					}break;
					case 'mousedown':{
						if(!this.focused){//如果没有focus，先focus
							this.focus();
							this.keepScreenInside();
						};

						var target=e.target;
						if(e.button!=0 || (target!=this.imgWindow && target!=this.img))return;
						e.preventDefault();
						var selectedTool=this.selectedTool;
						if(this.tempHand){
							this.move(e);
						}else if(this.tempZoom){
							this.zoom(e);
						}else if(selectedTool=='hand'){
							this.restoreBeforeTool=!this.hKeyUp;
							if(this.hKeyUp){
								this.move(e);
							}else{//鸟瞰视图
								this.aerialView(e);
							};
						}else if(selectedTool=='rotate'){
							var rIS=ImgWindowC.rotateIndicator.style;
							rIS.display='block';
							var origin={//旋转原点
								pageX:e.pageX - 30,//稍微偏左一点。
								pageY:e.pageY,
							};
							rIS.top=origin.pageY + 'px';
							rIS.left=origin.pageX + 'px';
							ImgWindowC.rotateIndicatorPointer.style[support.cssTransform]='rotate(' + this.rotatedRadians + 'rad)';
							this.restoreBeforeTool=!this.rKeyUp;
							this.rotate(origin);
						}else if(selectedTool=='zoom'){
							this.restoreBeforeTool=!this.zKeyUp;
							this.zoom(e);
						};
					}break;
					case 'wheel':{
						if(!this.focused)return;//如果没有focus
						if(e.deltaY===0)return;//非Y轴的滚动
						e.preventDefault();
						if(this.working)return;
						var oriZoomOut=this.zoomOut;
						this.zoomOut = !!(e.deltaY > 0);

						var ratio=this.getZoomRatio({
							x:e.clientX,
							y:e.clientY,
						});

						var level=this.getNextZoomLevel();

						this.zoom(level,ratio);
						this.zoomOut=oriZoomOut;
					}break;
					default:break;
				};
			},
			dblclickCommand:function(tool){
				var done;
				switch(tool){
					case 'hand':{//双击居中,并且适应屏幕
						this.zoom(1);
						this.fitToScreen();
						this.center(true,true);
						this.keepScreenInside();
					}break;
					case 'rotate':{//双击还原旋转
						if(this.rotatedRadians==0)return;
						done=true;
						this.rotate(0,true);
					}break;
					case 'zoom':{//双击还原缩放
						if(this.zoomLevel==1)return;
						done=true;
						this.zoom(1,{x:0,y:0});
					}break;
					default:break;
				};

				if((tool=='rotate' || tool=='zoom') && done){
					var imgWindow=this.imgWindow;
					var imgWinodowRect=imgWindow.getBoundingClientRect();
					var imgWindowStyle=imgWindow.style;
					if(imgWinodowRect.left<40){
						imgWindowStyle.left=40 + window.scrollX + 'px';
					};
					if(imgWinodowRect.top<-5){
						imgWindowStyle.top=-5 + window.scrollY +'px';
					};
					this.keepScreenInside();
				};

				},
			doFlipCommand:function(command){
				var map={
					fv:[/scaleY\([^)]*\)/i,' scaleY(-1) '],
					fh:[/scaleX\([^)]*\)/i,' scaleX(-1) '],
				};

				var iTransform=this.img.style[support.cssTransform];

				var toolClassList=this.toolMap[command].classList;

				if(map[command][0].test(iTransform)){
					iTransform=iTransform.replace(map[command][0],'');
					toolClassList.remove(this.selectedToolClass);
				}else{
					iTransform += map[command][1];
					toolClassList.add(this.selectedToolClass);
				};
				this.img.style[support.cssTransform]=iTransform;
				
			},
			selectTool:function(tool){
				var command=['fv','fh'];
				if(command.indexOf(tool)==-1){//工具选择
					if(this.selectedTool==tool)return;
					var selectedTool=this.selectedTool;
					this.selectedTool=tool;
					if(this.tempHand || this.tempZoom){//临时工具中。不变鼠标
						return;
					};
					this.toolMap[selectedTool].classList.remove(this.selectedToolClass);
					this.toolMap[tool].classList.add(this.selectedToolClass);
					this.changeCursor(tool);
				}else{//命令
					this.doFlipCommand(tool);
				};
			},
			remove:function(){
				if(this.removed)return;
				this.removed=true;
				this.blur(true);
				this.img.src='';//如果在加载中取消，图片也取消读取。
				if(this.overlayer){
					this.overlayer.parentNode.removeChild(this.overlayer);
				};
				this.imgWindow.parentNode.removeChild(this.imgWindow);

				var index=ImgWindowC.all.indexOf(this);
				ImgWindowC.all.splice(index,1);

				//focus next
				var topmost=0;
				ImgWindowC.all.forEach(function(iwin){
					if(iwin.zIndex > topmost){
						topmost=iwin;
					};
				});
				if(topmost){
					topmost.focus();
				};
			},
			aerialView:function(e){
				this.working=true;
				//记住现在的缩放比例
				var cLevel=this.zoomLevel;

				var wSize=getWindowSize();
				wSize.h -= 16;
				wSize.w -= 16;

				var imgWindow=this.imgWindow;
				var imgWindowCS=getComputedStyle(imgWindow,null);
				var rectSize={
					h:parseFloat(imgWindowCS.height),
					w:parseFloat(imgWindowCS.width),
				};
				var rectRatio=rectSize.h/rectSize.w;
				var windowRatio=wSize.h/wSize.w;

				var size;
				var rangeSize={};
				if(rectRatio > windowRatio){
					size={
						h:wSize.h,
						w:wSize.h / rectRatio,
					};
					rangeSize.h=Math.min(wSize.h *  (size.h / rectSize.h), size.h);
					rangeSize.w=Math.min(rangeSize.h / windowRatio , size.w);
				}else{
					size={
						w:wSize.w,
						h:wSize.w * rectRatio,
					};
					rangeSize.w=Math.min(wSize.w *  (size.w / rectSize.w), size.w);
					rangeSize.h=Math.min(rangeSize.w * windowRatio , size.h);
				};


				this.zoom(this.getRotatedImgCliSize(size).w/this.imgNaturalSize.w);

				this.center(true,true);

				this.keepScreenInside();

				var viewRange=this.viewRange;
				var vRS=viewRange.style;
				vRS.display='block';
				vRS.height=rangeSize.h + 'px';
				vRS.width=rangeSize.w + 'px';
				vRS.top=0 + 'px';
				vRS.left=0 + 'px';
				


				var viewRangeRect=viewRange.getBoundingClientRect();
				var viewRangeCenterCoor={
					x:viewRangeRect.left + window.scrollX + 1/2 * rangeSize.w,
					y:viewRangeRect.top + window.scrollY + 1/2 * rangeSize.h,
				};

				var self=this;

				var moveRange={
					x:[8,8+size.w-rangeSize.w],
					y:[8,8+size.h-rangeSize.h]
				};


				function setViewRangePosition(pageXY){
					var top=pageXY.y - viewRangeCenterCoor.y;
					var left=pageXY.x - viewRangeCenterCoor.x;
					if(top<=moveRange.y[0]){
						top=moveRange.y[0];
					}else if(top>=moveRange.y[1]){
						top=moveRange.y[1];
					};
					vRS.top= top + 'px';
					if(left<=moveRange.x[0]){
						left=moveRange.x[0];
					}else if(left>=moveRange.x[1]){
						left=moveRange.x[1];
					};
					vRS.left= left + 'px';
				};

				setViewRangePosition({
					x:e.pageX,
					y:e.pageY,
				});

				var moveHandler=function(e){
					setViewRangePosition({
						x:e.pageX,
						y:e.pageY,
					});
				};

				var mouseupHandler=function(){
					self.working=false;
					viewRange.style.display='none';
					self.zoom(cLevel);
					imgWindow.style.top= -13 -  rectSize.h * ((parseFloat(vRS.top) - moveRange.y[0])/size.h) + window.scrollY +'px'; 
					imgWindow.style.left= -13 - rectSize.w * ((parseFloat(vRS.left) - moveRange.x[0])/size.w) + window.scrollX +'px';
					
					//说明图片的高度没有屏幕高，居中
					//说明图片的宽度没有屏幕宽，居中
					self.center(rangeSize.w == size.w , rangeSize.h == size.h);

					self.keepScreenInside();

					document.removeEventListener('mousemove',moveHandler,true);
					document.removeEventListener('mouseup',mouseupHandler,true);
				};
				document.addEventListener('mousemove',moveHandler,true);
				document.addEventListener('mouseup',mouseupHandler,true);
			},
		};


		//载入动画
		function LoadingAnimC(data,buttonType,waitImgLoad,openInTopWindow){
			this.args=arrayFn.slice.call(arguments,0);
			this.data=data;//data
			this.buttonType=buttonType;//点击的按钮类型
			this.openInTopWindow=openInTopWindow;//是否在顶层窗口打开，如果在frame里面的话
			this.waitImgLoad=waitImgLoad;//是否等待完全读取后打开
			this.init();
		};

		LoadingAnimC.all=[];

		LoadingAnimC.prototype={
			init:function(){
				LoadingAnimC.all.push(this);
				this.addStyle();
				var container=document.createElement('span');

				container.className='pv-loading-container';
				this.loadingAnim=container;

				container.title='正在加载:' + this.data.src;
				container.innerHTML=
									'<span class="pv-loading-button pv-loading-retry" title="重试"></span>'+
									'<span class="pv-loading-button pv-loading-cancle" title="取消"></span>';

				document.body.appendChild(container);

				var self=this;
				container.addEventListener('click',function(e){
					var tcl=e.target.classList;
					if(tcl.contains('pv-loading-cancle')){
						self.imgReady.abort();
						self.remove();
					}else if(tcl.contains('pv-loading-retry')){
						self.remove();
						new LoadingAnimC(self.args[0],self.args[1],self.args[2],self.args[3]);
					};
				},true);


				this.setPosition();

				var img=new Image();
				img.src= this.buttonType=='current'? this.data.imgSrc : this.data.src;

				var opts={
					error:function(e){
						self.error(this,e);
					},
				};

				opts[this.waitImgLoad? 'load' : 'ready' ]=function(e){
					self.load(this,e);
				};

				this.imgReady=imgReady(img,opts);
			},
			addStyle:function(){
				if(LoadingAnimC.styleAdded)return;
				LoadingAnimC.styleAdded=true;
				var style=document.createElement('style');
				style.type='text/css';
				style.textContent='\
					.pv-loading-container {\
						position: absolute;\
						z-index:999999997;\
						background: black url("'+prefs.icons.loading+'") center no-repeat;\
						background-origin: content-box;\
						border: none;\
						padding: 1px 30px 1px 2px;\
						margin: 0;\
						opacity: 0.7;\
						height: 24px;\
						min-width: 24px;\
						box-shadow: 2px 2px 0px #666;\
						-webkit-transition: opacity 0.15s ease-in-out;\
						transition: opacity 0.15s ease-in-out;\
					}\
					.pv-loading-container:hover {\
						opacity: 0.9;\
					}\
					.pv-loading-button {\
						cursor: pointer;\
						height: 24px;\
						width: 24px;\
						position: absolute;\
						right: 0;\
						top: 0;\
						opacity: 0.4;\
						background:transparent center no-repeat;\
						-webkit-transition: opacity 0.15s ease-in-out;\
						transition: opacity 0.15s ease-in-out;\
					}\
					.pv-loading-button:hover {\
						opacity: 1;\
					}\
					.pv-loading-cancle{\
						background-image: url("'+prefs.icons.loadingCancle+'");\
					}\
					.pv-loading-retry{\
						display:none;\
						background-image: url("'+prefs.icons.retry+'");\
					}\
					.pv-loading-container_error{\
						background-image:none;\
					}\
					.pv-loading-container_error::after{\
						content:"加载失败";\
						line-height: 24px;\
						color: red;\
						font-size: 14px;\
						display:inline;\
					}\
					.pv-loading-container_error .pv-loading-cancle{\
						display:none;\
					}\
					.pv-loading-container_error .pv-loading-retry{\
						display:block;\
					}\
				';
				document.querySelector('head').appendChild(style);
			},
			remove:function(){
				if(!this.removed){
					this.removed=true;
					this.loadingAnim.parentNode.removeChild(this.loadingAnim);
					LoadingAnimC.all.splice(LoadingAnimC.all.indexOf(this),1);
				};
			},
			error:function(img,e){
				this.loadingAnim.classList.add('pv-loading-container_error');
				var self=this;
				setTimeout(function(){
					self.remove();
				},3000);
			},
			setPosition:function(){
				var position=getTargetPosition(this.data.img);
				var cs=this.loadingAnim.style;
				cs.top=position.top +1 + 'px';
				cs.left=position.left +1 + 'px';
				cs.removeProperty('display');
			},
			load:function(img,e){
				this.remove();
				this.img=img;
				var buttonType=this.buttonType;

				if(buttonType=='gallery'){
					var allData=this.getAllValidImgs();
					allData.target=this.data;
					this.data=allData;
				};

				if(this.openInTopWindow && isFrame && buttonType!='magnifier'){
					var data=this.data;

					//删除不能发送的项。
					var delCantClone=function(obj){
						delete obj.img;
						delete obj.imgPA;
					};

					if(Array.isArray(data)){
						frameSentSuccessData=frameSentData;
						frameSentData=cloneObject(data,true);//备份一次
						//console.log(frameSentData);

						delCantClone(data.target);
						data.forEach(function(obj){
							delCantClone(obj);
						});
					}else{
						delCantClone(data);
					};

					window.postMessage({
						messageID:messageID,
						src:img.src,
						data:data,
						command:'open',
						buttonType:buttonType,
						to:'top',
					},'*');
				}else{
					this.open();
				};


			},
			getAllValidImgs:function(){
				var imgs=document.getElementsByTagName('img'),//html collection
					validImgs=[]
				;
				arrayFn.forEach.call(imgs,function(img,index,imgs){
					var result=findPic(img);
					if(result){
						validImgs.push(result);
					};
				});
				return validImgs;
			},
			open:function(){
				switch(this.buttonType){
					case 'gallery':{
						if(!gallery){
							gallery=new GalleryC();
						};
						gallery.load(this.data,this.from);
					}break;
					case 'magnifier':{
						new MagnifierC(this.img,this.data);
					}break;
					case 'actual':;
					case 'current':;
					case 'original':{//original 是为了兼容以前的规则
						new ImgWindowC(this.img);
					}break;
				};
			},
		};

		//工具栏
		function FloatBarC(){
			this.init();
		};


		FloatBarC.prototype={
			init:function(){
				this.addStyle();
				var container=document.createElement('span');
				container.id='pv-float-bar-container';
				//innerHTML中的span不能加空格
				container.innerHTML=''+
									'<span class="pv-float-bar-button"></span>'+
									'<span class="pv-float-bar-button"></span>'+
									'<span class="pv-float-bar-button"></span>'+
									'<span class="pv-float-bar-button"></span>';
				document.body.appendChild(container);

				var buttons={};
				this.buttons=buttons;
				this.children=container.children;

				arrayFn.forEach.call(this.children,function(child,index,children){
					var titleMap={
						actual:'查看原始',
						gallery:'查看库',
						current:'查看当前',
						magnifier:'放大镜',
					};
					var buttonName=prefs.floatBar.butonOrder[index];
					buttons[buttonName]=child;
					child.title=titleMap[buttonName];
					child.classList.add('pv-float-bar-button-' + buttonName);
				});


				this.floatBar=container;
				this.shown=true;
				this.preShownImg=null;


				var self=this;
				container.addEventListener('click',function(e){
					var buttonType;
					var target=e.target;
					for(var type in buttons){
						if(!buttons.hasOwnProperty(type))return;
						if(target==buttons[type]){
							buttonType=type;
							break;
						};
					};
					if(!buttonType)return;

					self.hide();
					self.open(e,buttonType);

				},true);


				addCusMouseEvent('mouseleave',container,function(e){
					clearTimeout(self.hideTimer);
					self.hideTimer=setTimeout(function(){
						self.hide();
					},prefs.floatBar.hideDelay);
				});

				addCusMouseEvent('mouseenter',container,function(e){
					clearTimeout(self.hideTimer);
				});
			},
			addStyle:function(){
				var style=document.createElement('style');
				style.type='text/css';
				style.textContent='\
					#pv-float-bar-container {\
						position: absolute;\
						z-index:999999998;\
						top: -100px;\
						left: -100px;\
						padding: 5px;\
						margin: 0;\
						border: none;\
						opacity: 0.6;\
						line-height: 0;\
						-webkit-transition: opacity 0.2s ease-in-out;\
						transition: opacity 0.2s ease-in-out;\
					}\
					#pv-float-bar-container:hover {\
						opacity: 1;\
					}\
					.pv-float-bar-button {\
						cursor: pointer;\
						width: 18px;\
						height: 18px;\
						padding: 0;\
						margin:0;\
						margin-right:3px ;\
						border: none;\
						display: inline-block;\
						position: relative;\
						box-shadow: 1px 0 3px 0px rgba(0,0,0,0.9);\
						background: transparent center no-repeat;\
						background-size:100% 100%;\
						background-origin: content-box;\
						-webkit-transition: margin-left 0.15s ease-in-out,  width 0.15s ease-in-out,  height 0.15s ease-in-out;\
						transition: margin-left 0.15s ease-in-out,  width 0.15s ease-in-out,  height 0.15s ease-in-out;\
					}\
					.pv-float-bar-button:nth-child(n+2){\
						margin-left: -16px;\
					}\
					.pv-float-bar-button:first-child {\
						z-index: 4;\
					}\
					.pv-float-bar-button:nth-child(2) {\
						z-index: 3;\
					}\
					.pv-float-bar-button:nth-child(3) {\
						z-index: 2;\
					}\
					.pv-float-bar-button:last-child {\
						z-index: 1;\
					}\
					#pv-float-bar-container:hover > .pv-float-bar-button {\
						width: 24px;\
						height: 24px;\
					}\
					#pv-float-bar-container:hover > .pv-float-bar-button:nth-child(n+2) {\
						margin-left: 0;\
					}\
					.pv-float-bar-button-actual {\
						background-image:url("'+ prefs.icons.actual +'");\
					}\
					.pv-float-bar-button-gallery {\
						background-image:url("'+ prefs.icons.gallery +'");\
					}\
					.pv-float-bar-button-current {\
						background-image:url("'+ prefs.icons.current +'");\
					}\
					.pv-float-bar-button-magnifier {\
						background-image:url("'+ prefs.icons.magnifier +'");\
					}\
				';
				document.querySelector('head').appendChild(style);
			},
			start:function(data){

				//读取中的图片,不显示浮动栏,调整读取图标的位置.
				if(LoadingAnimC.all._find(function(item,index,array){
					if(data.img==item.data.img){
						return true;
					};
				}))return;


				//被放大镜盯上的图片,不要显示浮动栏.
				if(MagnifierC.all._find(function(item,index,array){
					if(data.img==item.data.img){
						return true;
					};
				}))return;

				this.data=data;
				var self=this;
				clearTimeout(this.hideTimer);

				var imgOutHandler=function(e){
					document.removeEventListener('mouseout',imgOutHandler,true);
					clearTimeout(self.showTimer);
					clearTimeout(self.hideTimer);
					self.hideTimer=setTimeout(function(){
						self.hide();
					},prefs.floatBar.hideDelay);
				};

				clearTimeout(this.globarOutTimer);
				this.globarOutTimer=setTimeout(function(){//稍微延时。错开由于css hover样式发生的out;
					document.addEventListener('mouseout',imgOutHandler,true);
				},100);


				if(data.img==this.preShownImg && this.shown){
					this.setPosition();
					return;
				};

				clearTimeout(this.showTimer);
				this.showTimer=setTimeout(function(){
					self.show();
				},prefs.floatBar.showDelay);
			},
			setButton:function(){
				if(this.data.type=='force'){
					this.buttons['actual'].style.display='none';
					this.buttons['magnifier'].style.display='none';
				}else{
					this.buttons['actual'].style.removeProperty('display');
					this.buttons['magnifier'].style.removeProperty('display');
				};

				//如果隐藏的按钮是第一个，css弹出层叠按钮的动画会有些维和，这些修正一下。
				var firstHidden;
				arrayFn._find.call(this.children,function(child, index, children){
					var cs=child.style;
					if(index==0){
						if(cs.display=='none'){
							firstHidden=true;
						};
					};

					if(firstHidden){//如果第一个是隐藏的，那么去掉以后第一个非隐藏的marginleft
						if(cs.display!='none'){
							cs.marginLeft=0;
							return true;
						};
					}else{
						cs.removeProperty('margin-left');
					};
				});
			},
			setPosition:function(){
				//如果图片被删除了，或者隐藏了。
				var bCR=this.data.img.getBoundingClientRect();

				if((bCR.left==0 && bCR.right==0) || (bCR.top==0 && bCR.bottom==0))return false;

				var targetPosi=getTargetPosition(this.data.img);
				var windowSize=getWindowSize();

				var floatBarPosi=prefs.floatBar.position.toLowerCase().trim().split(/\s+/);

				var offsetX=prefs.floatBar.offset.x;
				var offsetY=prefs.floatBar.offset.y;


				var scrollXY={
					x:window.scrollX,
					y:window.scrollY,
				};

				var fbs=this.floatBar.style;
				var setPosition={
					top:function(){
						var top=targetPosi.top;
						if(targetPosi.t < -offsetY){//满足图标被遮住的条件.
							top=scrollXY.y;
							offsetY=0;
						};
						fbs.top=top + offsetY + 'px';
					},
					right:function(){
						var right=windowSize.w - targetPosi.r;
						if(right < offsetX){
							right= -scrollXY.x;
							offsetX=0;
						}else{
							right -=scrollXY.x;
						};
						fbs.right=right - offsetX + 'px';
					},
					bottom:function(){
						var bottom=windowSize.h-targetPosi.b;
						if(bottom <= offsetY){
							offsetY=0;
						};
						bottom -= scrollXY.y;
						fbs.bottom=bottom - offsetY + 'px';
					},
					left:function(){
						var left=targetPosi.left;
						if(targetPosi.l < -offsetX){
							left=scrollXY.x;
							offsetX=0;
						};
						fbs.left=left + offsetX + 'px';
					},
				};

				setPosition[floatBarPosi[0]]();
				setPosition[floatBarPosi[1]]();
			},
			show:function(){
				if(this.setPosition()===false){
					return;
				};
				this.preShownImg=this.data.img;
				this.shown=true;
				this.setButton();
				this.floatBar.style.removeProperty('display');
				clearTimeout(this.hideTimer);
			},
			hide:function(){
				clearTimeout(this.showTimer);
				this.shown=false;
				this.floatBar.style.display='none';
			},
			open:function(e,buttonType){
				var waitImgLoad=e.ctrlKey? !prefs.waitImgLoad : prefs.waitImgLoad;//按住ctrl取反向值
				var openInTopWindow=e.shiftKey? !prefs.framesPicOpenInTopWindow : prefs.framesPicOpenInTopWindow;//按住shift取反向值

				if(!waitImgLoad && buttonType=='magnifier' && !envir.chrome){//非chrome的background-image需要全部载入后才能显示出来
					waitImgLoad=true;
				};
				new LoadingAnimC(this.data,buttonType,waitImgLoad,openInTopWindow);
			},
		};


		var matchedRule,
			URL=location.href,
			floatBar;

		function findPic(img){
			var imgPA=getElementByXpath('./ancestor::a[1]',img);

			var iPASrc=imgPA? imgPA.href : '';
			//base64字符串过场导致正则匹配卡死浏览器
			var base64Img=/^data:[^;]+;base64,/i.test(img.src);


			if(matchedRule===undefined){//找到符合站点的高级规则,并缓存.
				matchedRule=siteInfo._find(function(site,index,array){
					if(site.enabled && site.url && site.url.test(URL)){
						return true;
					};
				});
				matchedRule=matchedRule? matchedRule[0] : false;
				//console.log('匹配的规则：',matchedRule);
			};

			var src, type;

			if(!src && matchedRule){//通过高级规则获取.
				try{
					src=matchedRule.getImage.call(img,img,imgPA);
				}catch(err){
					throwErrorInfo(err);
				};

				if(src)type='rule';
			};

			if(!src && !base64Img){//遍历通配规则
				tprules._find(function(rule,index,array){
					try{
						src=rule.call(img,img,imgPA);
						if(src){
							//console.log('匹配的通配规则',rule);
							return true;
						};
					}catch(err){
						throwErrorInfo(err);
					};
				});
				if(src)type='tpRule';
			};

			if(!src && imgPA){//链接可能是一张图片...
				if(/\.(?:jpg|jpeg|png|gif|bmp)$/i.test(iPASrc)){
					src=iPASrc;
				};
				if(src)type='scale';
			};

			if(!src){//本图片是否被缩放.
				var imgAS={//实际尺寸。
					h:img.naturalHeight,
					w:img.naturalWidth,
				};
				var imgCS=getCurrentSize(img);
				if(!(imgAS.w==imgCS.w && imgAS.h==imgCS.h)){//如果不是两者完全相等,那么被缩放了.
					if(imgAS.h > prefs.floatBar.minSizeLimit.h || imgAS.w > prefs.floatBar.minSizeLimit.w){//最小限定判断.
						src=img.src;
						type='scale';
					};
				}else{
					if(prefs.floatBar.forceShow.enabled && (imgCS.w>=prefs.floatBar.forceShow.size.w && imgCS.h>=prefs.floatBar.forceShow.size.h)){
						src=img.src;
						type='force';
					};
				};
			};


			if(!src)return;

			var ret={
				src:src,//得到的src
				type:type,//通过哪种方式得到的
				imgSrc:img.src,//处理的图片的src
				iPASrc:iPASrc,//图片的第一个父a元素的链接地址

				img:img,//处理的图片
				imgPA:imgPA,//图片的第一个父a元素
			};

			//console.log('图片查找结果:',ret);
			return ret;
		};


		var isFrame=window!=window.parent;
		var frameSentData;
		var frameSentSuccessData;
		window.addEventListener('message',function(e){//contentscript里面的message监听，监听来自别的窗口的数据。
			var data=e.data;
			if( !data || !data.messageID || data.messageID != messageID )return;//通信ID认证
			var source=e.source;
			//chrome中所有window窗口的引用都是undefined
			if(typeof source=='undefined' || source!==window){//来自别的窗口
				if(!isFrame){//顶层窗口
					//console.log('top-contentscript接收到：',e);

					var command=data.command;
					switch(command){
						case 'open':{
							var img=new Image();
							img.src=data.src;

							imgReady(img,{
								ready:function(){
									LoadingAnimC.prototype.open.call({
										img:img,
										data:data.data,
										buttonType:data.buttonType,
										from:data.from,//来自哪个窗口
									});
								},
							});
						}break;
						case 'navigateToImg':{
							var cusEvent=document.createEvent('CustomEvent');
							cusEvent.initCustomEvent('pv-navigateToImg',false,false,data.exist);
							document.dispatchEvent(cusEvent);
						}break;
					};

				}else{//frame窗口
					//console.log('frame-contentscript接收到',e);
					var command=data.command;
					switch(command){
						case 'navigateToImg':{

							if(!frameSentData.unique){
								var unique=GalleryC.prototype.unique(frameSentData);
								frameSentData=unique.data;
								frameSentData.unique=true;
							};
							var targetImg=frameSentData[data.index].img;
							var exist=(document.contains(targetImg) && getComputedStyle(targetImg,null).display!='none');

							if(exist){
								if(gallery && gallery.shown){//frame里面也打开了一个呢。
									gallery.minimize();
								};
								setTimeout(function(){
									GalleryC.prototype.navigateToImg(targetImg);
									flashEle(targetImg);
								},0);
							};
							window.postMessage({
								messageID:messageID,
								command:'navigateToImg',
								exist:exist,
								to:data.from,
							},'*');
						}break;
						case 'sendFail':{
							frameSentData=frameSentSuccessData;//frameSentData重置为发送成功的数据。
						}break;
					};
				};

			};
		},true);



		//页面脚本用来转发消息
		//原因chrome的contentscript无法访问非自己外的别的窗口。都会返回undefined，自然也无法向其他的窗口发送信息,这里用pagescript做个中间代理
		//通讯逻辑..A页面的contentscript发送到A页面的pagescript，pagescript转交给B页面的contentscript

		var messageID='pv-0.5106795670312598';

		var pageScript=document.createElement('script');

		var pageScriptText=function(messageID){
			var frameID=Math.random();
			var frames={
				top:window.top,
			};

			window.addEventListener('message',function(e){
				var data=e.data;
				if( !data || !data.messageID || data.messageID != messageID )return;//通信ID认证
				var source=e.source;
				if(source===window){//来自contentscript,发送出去,或者干嘛。
					if(data.to){
						data.from=frameID;
						frames[data.to].postMessage(data,'*');
					}else{
						switch(data.command){
							case 'getIframeObject':{
								var frameWindow=frames[data.windowId];
								var iframes=document.getElementsByTagName('iframe');
								var iframe;
								var ret;
								for(var i=iframes.length-1 ; i>=0 ; i--){
									iframe=iframes[i];
									if(iframe.contentWindow===frameWindow){
										ret=iframe;
										break;
									};
								};
								var cusEvent=document.createEvent('CustomEvent');
								cusEvent.initCustomEvent('pv-getIframeObject',false,false,ret);
								document.dispatchEvent(cusEvent);
							}break;
						};
					};
					
				}else{//来自别的窗口的，contentscript可以直接接收，这里保存下来自的窗口的引用
					frames[data.from]=source;
				};
			},true)
		};

		pageScript.textContent='(' + pageScriptText.toString() + ')('+ JSON.stringify(messageID) +')';
		document.querySelector('head').appendChild(pageScript);


		function clikToOpen(data){

			var preventDefault = matchedRule.clikToOpen.preventDefault;

			function mouseout(){
				document.removeEventListener('mouseout',mouseout,true);
				document.removeEventListener('click',click,true);
				if(data.imgPA && preventDefault){
					data.imgPA.removeEventListener('click',clickA,false);
				};
			};

			function click(e){
				FloatBarC.prototype.open.call({
					data:data,
				},
				e,
				matchedRule.clikToOpen.type);
			};

			function clickA(e){//阻止a的默认行为
				e.preventDefault();
			};

			document.addEventListener('click',click,true);

			if(data.imgPA && preventDefault){
				data.imgPA.addEventListener('click',clickA,false);
			};

			setTimeout(function(){//稍微延时。错开由于css hover样式发生的out;
				document.addEventListener('mouseout',mouseout,true);
			},100);
			
			return function(){
				mouseout()
			};
		};

		//监听 mouseover
		var canclePreCTO;
		function globalMouseoverHandler(e){

			if(galleryMode)return;//库模式全屏中......

			var target=e.target;
			if(target.nodeName!='IMG' || target.classList.contains('pv-pic-not-allowed')){
				return;
			};

			var result=findPic(target);
			if(result){
				if(!floatBar){
					floatBar=new FloatBarC();
				};
				if(result.type=='rule' && matchedRule.clikToOpen && matchedRule.clikToOpen.enabled){
					if(canclePreCTO){//取消上次的，防止一次点击打开多张图片
						canclePreCTO();
					};
					canclePreCTO=clikToOpen(result);
				};
				floatBar.start(result);//出现悬浮工具栏
			};
		};

		document.addEventListener('mouseover',globalMouseoverHandler,true);
	};


	function init2(){
		init(topObject,window,document,arrayFn,envir);
	};


	var arrayFn=(function(){
		//Array的某些方法对所有的类数组都有效，比如HTMLCollection,NodeList

		//添加一个当函数返回true时，返回[array[index],index]，并且跳出循环的方法
		//类似做到 for 循环，在满足条件的时候直接break跳出的效果。
		if(typeof Array.prototype['_find']!='function'){
			Object.defineProperty(Array.prototype,'_find',{
				value:function(callback , thisArg){
					if (this == null){
						throw new TypeError( "this is null or not defined" );
					};

					if(typeof callback != 'function') {
						throw new TypeError( callback + " is not a function" );
					};

					var i = 0,
						l = this.length,
						value,
						hasOwnProperty=Object.prototype.hasOwnProperty
					;


					while(i<l){
						if(hasOwnProperty.call(this,i)){
							value = this[i];
							if(callback.call( thisArg, value, i, this )===true){
								return [value,i,this];
							};
						};
						i++;
					};
				},
				writable:true,
				enumerable:false,//与原生方法一样不可枚举，维护网页和谐。。。
				configurable:true,
			});
		};

		var arrayProto=Array.prototype;
		return {
			_find:arrayProto._find,
			slice:arrayProto.slice,
			forEach:arrayProto.forEach,
			some:arrayProto.some,
			every:arrayProto.every,
			map:arrayProto.map,
			filter:arrayProto.filter,
			indexOf:arrayProto.indexOf,
			lastIndexOf:arrayProto.lastIndexOf,
		};

	})();


	//检测运行环境
	var envir={
		opera:!!window.opera,
		chrome:!!window.chrome,
		firefox:typeof XPCNativeWrapper=='function'? true : false,
	};


	if(document.readyState=='loading'){
		document.addEventListener('DOMContentLoaded',init2,true);
	}else if(document.readyState!='complete'){
		document.addEventListener('DOMContentLoaded',function(){
			window.removeEventListener('load',init2,true);
			init2();
		},true);
		window.addEventListener('load',init2,true);
	}else{
		init2();
	};
})(this,window,document);