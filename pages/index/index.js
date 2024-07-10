/*
 * 
 * 微慕小程序开源版
 * author: jianbo
 * organization: 微慕  www.minapper.com
 * github:    https://github.com/iamxjb/winxin-app-watch-life.net
 * 技术支持微信号：iamxjb
 * 开源协议：MIT
 * 
 *  *Copyright (c) 2017 https://www.minapper.com All rights reserved.
 */

var Api = require('../../utils/api.js');
var util = require('../../utils/util.js');

var wxApi = require('../../utils/wxApi.js')
var wxRequest = require('../../utils/wxRequest.js')
import config from '../../utils/config.js'
const Adapter = require('../../utils/adapter.js')
var pageCount = config.getPageCount;

var webSiteName = config.getWebsiteName;
var domain = config.getDomain;


Page({
  data: {
    postsList: [],
    postsstickyList: [],
    postsShowSwiperList: [],
    isLastPage: false,
    page: 1,
    search: '',
    categories: 0,
    showerror: "none",
    showCategoryName: "",
    categoryName: "",
    floatDisplay: "none",
    listAdsuccess: true,
    webSiteName: webSiteName,
    domain: domain,
    isFirst: false, // 是否第一次打开,
    isLoading: false,
    swipe_nav: [],
    postImageUrl:'',
    selected_nav: [],
    articleStyle: config.articleStyle || 1
  },
  getArticleStyle() {
    const articleStyle = wx.getStorageSync('articleStyle') || config.articleStyle || 1
    this.setData({
      articleStyle: +articleStyle,
    })
  },
  formSubmit: function (e) {
    var url = '../list/list'
    var key = '';
    if (e.currentTarget.id == "search-input") {
      key = e.detail.value;
    } else {

      key = e.detail.value.input;

    }
    if (key != '') {
      url = url + '?search=' + key;
      wx.navigateTo({
        url: url
      })
    } else {
      wx.showModal({
        title: '提示',
        content: '请输入内容',
        showCancel: false,
      });
    }
  },
  onShareAppMessage: function () {
    return {
      title: '“' + webSiteName + '”小程序,基于微慕WordPress版小程序构建',
      path: 'pages/index/index',
      appInfo: {
        'appId': config.appghId
      },
      success: function (res) {
        // 转发成功
      },
      fail: function (res) {
        // 转发失败
      }
    }
  },
  // 自定义分享朋友圈
  onShareTimeline: function () {
    return {
      title: '“' + webSiteName + '”小程序,基于微慕WordPress版小程序构建',
      path: 'pages/index/index',

    }
  },
  onPullDownRefresh: function () {
    var self = this;
    self.setData({
      showerror: "none",
      floatDisplay: "none",
      isLastPage: false,
      page: 1,
      postsShowSwiperList: [],
      listAdsuccess: true

    });
    this.getHomeconfig();
    this.fetchAllPosts(self.data);


  },
  onReachBottom: function () {

    var self = this;
    if (!self.data.isLastPage) {
      self.setData({
        page: self.data.page + 1
      });
      console.log('当前页' + self.data.page);
      this.fetchAllPosts(self.data);
    } else {
      console.log('最后一页');
    }

  },
  onLoad: function (options) {
    var self = this;
    wx.showShareMenu({
      withShareTicket: false,
      menus: ['shareAppMessage', 'shareTimeline'],
      success: function (e) {
        //console.log(e);
      }
    })
    // 设置页面标题：文章分类
    wx.setNavigationBarTitle({
      title: webSiteName
    });
 
    Adapter.setInterstitialAd("enable_index_interstitial_ad");
    self.fetchAllPosts(self.data);

    // 判断用户是不是第一次打开，弹出添加到我的小程序提示
    var isFirstStorage = wx.getStorageSync('isFirst');
    // console.log(isFirstStorage);
    if (!isFirstStorage) {
      self.setData({
        isFirst: true
      });
      wx.setStorageSync('isFirst', 'no')
      // console.log(wx.getStorageSync('isFirst'));
      setTimeout(function () {
        self.setData({
          isFirst: false
        });
      }, 5000)
    }

    this.getHomeconfig();

  },
  onShow: function (options) {
    this.getArticleStyle()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    wx.setStorageSync('openLinkCount', 0);

    var nowDate = new Date();
    nowDate = nowDate.getFullYear() + "-" + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
    nowDate = new Date(nowDate).getTime();
    var _openAdLogs = wx.getStorageSync('openAdLogs') || [];
    var openAdLogs = [];
    _openAdLogs.map(function (log) {
      if (new Date(log["date"]).getTime() >= nowDate) {
        openAdLogs.unshift(log);
      }

    })

    wx.setStorageSync('openAdLogs', openAdLogs);
    console.log(wx.getStorageSync('openAdLogs'));

  },
  getHomeconfig() {
    //获取扩展设置
    var self = this;

    var getHomeconfig = wxRequest.getRequest(Api.get_homeconfig());
    getHomeconfig.then(res => {
      // console.log(res.data);
      let expand = res.data.expand;
      let swipe_nav = expand.swipe_nav;
      let selected_nav = expand.selected_nav;
      let _d = res.data.downloadfileDomain
      let _b = res.data.businessDomain

      let zanImageurl = res.data.zanImageurl
      let logoImageurl = res.data.logoImageurl
      let postImageUrl = res.data.postImageUrl
      let downloadfileDomain = _d.length ? _d.split(',') : []
      let businessDomain = _b.length ? _b.split(',') : []
      self.setData({
        swipe_nav: swipe_nav,
        selected_nav: selected_nav,
        postImageUrl: postImageUrl
      });
      wx.setStorageSync('downloadfileDomain', downloadfileDomain);
      wx.setStorageSync('businessDomain', businessDomain);
      wx.setStorageSync('zanImageurl', zanImageurl);
      wx.setStorageSync('logoImageurl', logoImageurl);
      wx.setStorageSync('postImageUrl', postImageUrl);
    });
  },

  //获取文章列表数据
  fetchAllPosts(data = {}) {
    const self = this;
    const { page = 1, categories = 0, search = '' } = data;
  
    wx.showLoading({ title: '加载中' });
  
    const postsPromise = wxRequest.getRequest(Api.getPosts({ page, categories, search }));
    const stickyPostsPromise = wxRequest.getRequest(Api.getStickyPosts());
  
    Promise.all([postsPromise, stickyPostsPromise])
      .then(([postsResponse, stickyPostsResponse]) => {
        if (postsResponse.statusCode === 200 && stickyPostsResponse.statusCode === 200) {
          const formatPost = (item) => ({
            ...item,
            categoryImage: "",
            post_medium_image:  item.post_medium_image || self.data.postImageUrl ||"../../images/logo700.png",
            date: util.cutstr(item.date, 10, 1)
          });
  
          const postsList = postsResponse.data.map(formatPost);
          const postsstickyList = stickyPostsResponse.data.map(formatPost);
  
          self.setData({
            postsList: page === 1 ? postsList : [...self.data.postsList, ...postsList],
            postsstickyList,
            isLastPage: postsList.length < pageCount,
            floatDisplay: "block"
          });
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none',
            duration: 1500
          });
        }
      })
      .catch(error => {
        console.error('Failed to fetch posts:', error);
        wx.showToast({
          title: '加载失败',
          icon: 'none',
          duration: 1500
        });
      })
      .finally(() => {
        wx.hideLoading();
        wx.stopPullDownRefresh();
      });
  },

 
  //加载分页
  loadMore: function (e) {

    var self = this;
    if (!self.data.isLastPage) {
      self.setData({
        page: self.data.page + 1
      });
      //console.log('当前页' + self.data.page);
      this.fetchAllPosts(self.data);
    } else {
      wx.showToast({
        title: '没有更多内容',
        mask: false,
        duration: 1000
      });
    }
  },
  // 跳转至查看文章详情
  redictDetail: function (e) {
    // console.log('查看文章');
    var id = e.currentTarget.id,
      url = '../detail/detail?id=' + id;
    wx.navigateTo({
      url: url
    })
  },
  //首页图标跳转
  onNavRedirect: function (e) {
    var redicttype = e.currentTarget.dataset.redicttype;
    var url = e.currentTarget.dataset.url == null ? '' : e.currentTarget.dataset.url;
    var appid = e.currentTarget.dataset.appid == null ? '' : e.currentTarget.dataset.appid;
    var extraData = e.currentTarget.dataset.extraData == null ? '' : e.currentTarget.dataset.extraData;
    if (redicttype == 'apppage') { //跳转到小程序内部页面         
      wx.navigateTo({
        url: url
      })
    } else if (redicttype == 'webpage') //跳转到web-view内嵌的页面
    {
      url = '../webpage/webpage?url=' + encodeURIComponent(url);
      wx.navigateTo({
        url: url
      })
    } else if (redicttype == 'miniapp') //跳转到其他app
    {
      wx.navigateToMiniProgram({
        appId: appid,
        envVersion: 'release',
        path: url,
        extraData: extraData,
        success(res) {
          // 打开成功
        },
        fail: function (res) {
          console.log(res);
        }
      })
    }

  },
  // 跳转至查看小程序列表页面或文章详情页
  redictAppDetail: function (e) {
    let {
      type,
      appid,
      url,
      path,
      jumptype,
      unassociated
    } = e.currentTarget.dataset

    if (type === 'apppage') { // 小程序页面         
      wx.navigateTo({
        url: path
      })
    }
    if (type === 'webpage') { // web-view页面
      if (unassociated === 'yes') {
        wx.openOfficialAccountArticle({
          url: url, // 此处填写公众号文章连接
          success: res => {
            console.log(res);
          },
          fail: res => {
            console.log(res);
          }
        })
      } else {
        url = '../webpage/webpage?url=' + encodeURIComponent(url)
        wx.navigateTo({
          url
        })
      }
    }
    if (type === 'miniapp') { // 其他小程序
      if (jumptype == 'embedded') {
        wx.openEmbeddedMiniProgram({
          appId: appid,
          path: path,
          allowFullScreen: true
        })

      } else {
        wx.navigateToMiniProgram({
          appId: appid,
          path: path
        })
      }

    }
  },
  //返回首页
  redictHome: function (e) {
    //console.log('查看某类别下的文章');  
    var id = e.currentTarget.dataset.id,
      url = '/pages/index/index';
    wx.switchTab({
      url: url
    });
  },
  adbinderror: function (e) {
    var self = this;
    console.log(e.detail.errCode);
    console.log(e.detail.errMsg);
    if (e.detail.errCode) {
      self.setData({
        listAdsuccess: false
      })
    }

  },
})