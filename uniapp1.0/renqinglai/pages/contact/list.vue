<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-box">
      <input class="search-input" type="text" v-model="keyword" placeholder="搜索联系人" @confirm="search" />
    </view>
    
    <scroll-view class="contact-list" scroll-y @scrolltolower="onLoadMore" enable-back-to-top>
      <view v-for="(section, sIndex) in contacts" :key="sIndex">
        <view class="section-header">{{ section.title }}</view>
        <view class="contact-item" v-for="(item, index) in section.data" :key="index" @click="navToDetail(item)">
          <view class="avatar">{{ item.name[0] }}</view>
          <view class="info">
            <text class="name">{{ item.name }}</text>
            <text class="phone">{{ item.phoneNumber || '暂无电话' }}</text>
          </view>
          <view class="stats">
            <view class="stat-row income">
              <text class="label">收:</text>
              <text class="val">¥{{ item.totalReceived }}</text>
            </view>
            <view class="stat-row expense">
              <text class="label">送:</text>
              <text class="val">¥{{ item.totalGiven }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="contacts.length === 0" class="empty-state">
        <text>暂无联系人</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      keyword: '',
      contacts: []
    };
  },
  onShow() {
    this.fetchContacts();
  },
  onPullDownRefresh() {
    this.fetchContacts(true);
  },
  methods: {
    async fetchContacts(isPullDown = false) {
      if (!isPullDown) {
        uni.showNavigationBarLoading();
      }
      try {
        let url = this.keyword ? `/contacts?search=${this.keyword}` : '/contacts';
        // 添加时间戳防止缓存
        url += (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
        
        const res = await request({ url });
        if (res.success) {
          this.contacts = res.data;
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isPullDown) {
          uni.stopPullDownRefresh();
        }
        uni.hideNavigationBarLoading();
      }
    },
    search() {
      this.fetchContacts();
    },
    onLoadMore() {
      // 可以在这里实现分页加载
    },
    navToDetail(contact) {
      uni.navigateTo({
        url: `/pages/contact/detail?id=${contact.id}&name=${contact.name}`
      });
    }
  }
};
</script>

<style lang="scss">
.container {
  background-color: #f5f7fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 20rpx;
  background-color: #fff;
  z-index: 10;
  
  .search-input {
    background-color: #f5f5f5;
    height: 70rpx;
    border-radius: 35rpx;
    padding: 0 30rpx;
    font-size: 28rpx;
  }
}

.contact-list {
  flex: 1;
  height: 0; // 重要：让 flex 生效
  padding: 20rpx;
  box-sizing: border-box;
}

.section-header {
  font-size: 28rpx;
  color: #999;
  padding: 10rpx 20rpx;
  background-color: #f5f7fa;
}

.section-header {
  font-size: 28rpx;
  color: #999;
  padding: 10rpx 20rpx;
  background-color: #f5f7fa;
}

.contact-item {
  background-color: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 2rpx;
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  
  .avatar {
    width: 80rpx;
    height: 80rpx;
    background-color: #3cc51f;
    color: #fff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 32rpx;
    font-weight: bold;
    margin-right: 20rpx;
  }
  
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .name {
      font-size: 32rpx;
      color: #333;
      margin-bottom: 5rpx;
    }
    .phone {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    
    .stat-row {
      font-size: 24rpx;
      margin-bottom: 5rpx;
      
      .label {
        color: #999;
        margin-right: 10rpx;
      }
      
      &.income .val { color: #ff5a5f; }
      &.expense .val { color: #3cc51f; }
    }
  }
}
.empty-state {
  text-align: center;
  padding-top: 100rpx;
  color: #999;
}
</style>
