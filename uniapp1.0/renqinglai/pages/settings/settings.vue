<template>
  <view class="container">
    <view class="user-card">
      <view class="avatar">
        <image src="/static/logo.png" mode="aspectFit"></image>
      </view>
      <view class="info">
        <text class="phone">{{ user.phoneNumber }}</text>
        <text class="uid">ID: {{ user.id }}</text>
      </view>
    </view>
    
    <view class="menu-list">
      <view class="menu-item">
        <text>关于我们</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item">
        <text>版本信息</text>
        <text class="desc">v1.0.0</text>
      </view>
    </view>
    
    <button class="logout-btn" @click="logout">退出登录</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      user: {}
    };
  },
  onShow() {
    const user = uni.getStorageSync('user');
    if (user) {
      this.user = user;
    }
  },
  methods: {
    logout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('token');
            uni.removeStorageSync('user');
            uni.reLaunch({
              url: '/pages/login/login'
            });
          }
        }
      });
    }
  }
};
</script>

<style lang="scss">
.container {
  background-color: #f5f7fa;
  min-height: 100vh;
  padding: 20rpx;
}

.user-card {
  background-color: #fff;
  padding: 40rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
  
  .avatar {
    width: 120rpx;
    height: 120rpx;
    margin-right: 30rpx;
    
    image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }
  
  .info {
    display: flex;
    flex-direction: column;
    
    .phone {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 10rpx;
    }
    .uid {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.menu-list {
  background-color: #fff;
  border-radius: 12rpx;
  margin-bottom: 60rpx;
  
  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #eee;
    
    &:last-child {
      border-bottom: none;
    }
    
    .arrow, .desc {
      color: #999;
    }
  }
}

.logout-btn {
  background-color: #fff;
  color: #ff5a5f;
  font-size: 32rpx;
}
</style>
