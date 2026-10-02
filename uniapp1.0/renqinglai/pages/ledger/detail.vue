<template>
  <view class="container">
    <view class="header-card">
      <view class="title-row">
        <text class="title">{{ ledger.name }}</text>
        <text class="type-tag">{{ ledger.type === 'received' ? '收礼' : '送礼' }}</text>
      </view>
      <view class="stats-row">
        <view class="stat-item">
          <text class="val">¥{{ ledger.totalAmount || 0 }}</text>
          <text class="label">总金额</text>
        </view>
        <view class="stat-item">
          <text class="val">{{ ledger.totalRecords || 0 }}</text>
          <text class="label">笔数</text>
        </view>
      </view>
    </view>
    
    <view class="record-list">
      <view class="list-header">记录列表</view>
      <view class="record-item" v-for="(item, index) in records" :key="index">
        <view class="left">
          <view class="avatar">{{ item.contactName[0] }}</view>
          <view class="info">
            <text class="name">{{ item.contactName }}</text>
            <text class="date">{{ formatDate(item.recordDate) }}</text>
          </view>
        </view>
        <view class="right">
          <text class="amount">¥{{ item.amount }}</text>
        </view>
      </view>
    </view>
    
    <!-- 记一笔 FAB -->
    <view class="fab-btn" @click="navToAddRecord">
      <text class="text">记</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      ledgerId: '',
      ledger: {},
      records: []
    };
  },
  onLoad(options) {
    if (options.id) {
      this.ledgerId = options.id;
    }
  },
  onShow() {
    if (this.ledgerId) {
      this.fetchDetail();
      this.fetchRecords();
    }
  },
  methods: {
    async fetchDetail() {
      try {
        const res = await request({ url: `/ledgers/${this.ledgerId}` });
        if (res.success) {
          this.ledger = res.data;
        }
      } catch (e) { console.error(e); }
    },
    async fetchRecords() {
      try {
        const res = await request({ url: `/records?ledgerId=${this.ledgerId}` });
        if (res.success) {
          this.records = res.data.list;
        }
      } catch (e) { console.error(e); }
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString();
    },
    navToAddRecord() {
      uni.navigateTo({
        url: `/pages/record/add?ledgerId=${this.ledgerId}&ledgerName=${this.ledger.name}`
      });
    }
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 120rpx;
}

.header-card {
  background-color: #ff5a5f;
  color: #fff;
  padding: 40rpx;
  
  .title-row {
    display: flex;
    align-items: center;
    margin-bottom: 40rpx;
    
    .title {
      font-size: 40rpx;
      font-weight: bold;
      margin-right: 20rpx;
    }
    
    .type-tag {
      font-size: 24rpx;
      background-color: rgba(255,255,255,0.2);
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
    }
  }
  
  .stats-row {
    display: flex;
    
    .stat-item {
      margin-right: 80rpx;
      display: flex;
      flex-direction: column;
      
      .val {
        font-size: 48rpx;
        font-weight: bold;
        margin-bottom: 10rpx;
      }
      .label {
        font-size: 24rpx;
        opacity: 0.8;
      }
    }
  }
}

.record-list {
  padding: 20rpx;
  
  .list-header {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 20rpx;
    margin-left: 10rpx;
  }
  
  .record-item {
    background-color: #fff;
    padding: 20rpx;
    border-radius: 12rpx;
    margin-bottom: 2rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .left {
      display: flex;
      align-items: center;
      
      .avatar {
        width: 80rpx;
        height: 80rpx;
        background-color: #eee;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 20rpx;
        color: #666;
        font-weight: bold;
      }
      
      .info {
        display: flex;
        flex-direction: column;
        
        .name {
          font-size: 30rpx;
          color: #333;
          margin-bottom: 5rpx;
        }
        .date {
          font-size: 24rpx;
          color: #999;
        }
      }
    }
    
    .right {
      .amount {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }
    }
  }
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 60rpx;
  width: 100rpx;
  height: 100rpx;
  background-color: #ff5a5f;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 10rpx rgba(255, 90, 95, 0.4);
  z-index: 100;
  
  .text {
    color: #fff;
    font-size: 36rpx;
    font-weight: bold;
  }
}
</style>
