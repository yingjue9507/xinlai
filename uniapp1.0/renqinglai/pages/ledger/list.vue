<template>
  <view class="container">
    <view class="ledger-list">
      <view class="ledger-item" v-for="(item, index) in ledgers" :key="index" @click="navToDetail(item.id)">
        <view class="item-header">
          <text class="ledger-name">{{ item.name }}</text>
          <text class="ledger-date">{{ formatDate(item.creationDate) }}</text>
        </view>
        <view class="item-body">
          <view class="info-row">
            <text class="label">类型:</text>
            <text class="value">{{ item.type === 'received' ? '收礼' : '送礼' }}</text>
          </view>
          <view class="info-row">
            <text class="label">金额:</text>
            <text class="value amount">¥{{ item.totalAmount }}</text>
          </view>
          <view class="info-row">
            <text class="label">记录:</text>
            <text class="value">{{ item.totalRecords }}笔</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="ledgers.length === 0" class="empty-state">
      <text>暂无账本，点击右下角添加</text>
    </view>

    <!-- FAB -->
    <view class="fab-btn" @click="navToCreate">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      ledgers: []
    };
  },
  onShow() {
    this.fetchLedgers();
  },
  onPullDownRefresh() {
    this.fetchLedgers();
  },
  methods: {
    async fetchLedgers() {
      try {
        const res = await request({ url: '/ledgers' });
        if (res.success) {
          this.ledgers = res.data;
        }
      } catch (e) {
        console.error(e);
      } finally {
        uni.stopPullDownRefresh();
      }
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString();
    },
    navToDetail(id) {
      uni.navigateTo({
        url: `/pages/ledger/detail?id=${id}`
      });
    },
    navToCreate() {
      uni.navigateTo({
        url: '/pages/ledger/create'
      });
    }
  }
};
</script>

<style lang="scss">
.container {
  padding: 20rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.ledger-list {
  padding-bottom: 100rpx;
}

.ledger-item {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  
  .item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15rpx;
    padding-bottom: 15rpx;
    border-bottom: 1rpx solid #eee;
    
    .ledger-name {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    .ledger-date {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .item-body {
    display: flex;
    justify-content: space-between;
    
    .info-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .label {
        font-size: 24rpx;
        color: #999;
        margin-bottom: 5rpx;
      }
      .value {
        font-size: 28rpx;
        color: #333;
        
        &.amount {
          color: #ff5a5f;
          font-weight: bold;
        }
      }
    }
  }
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 150rpx; /* 避开 TabBar */
  width: 100rpx;
  height: 100rpx;
  background-color: #ff5a5f;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 10rpx rgba(255, 90, 95, 0.4);
  z-index: 100;
  
  .plus {
    color: #fff;
    font-size: 60rpx;
    line-height: 1;
    margin-top: -10rpx;
  }
}

.empty-state {
  text-align: center;
  margin-top: 100rpx;
  color: #999;
}
</style>
