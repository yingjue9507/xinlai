<template>
  <view class="container">
    <view class="header-card">
      <view class="avatar-large">{{ name[0] }}</view>
      <text class="name">{{ name }}</text>
    </view>
    
    <view class="record-list">
      <view class="list-header">往来记录</view>
      <view class="record-item" v-for="(item, index) in records" :key="index">
        <view class="left">
          <view class="info">
            <text class="ledger-name">{{ item.ledger.ledgerName }}</text>
            <text class="date">{{ formatDate(item.recordDate) }}</text>
          </view>
        </view>
        <view class="right">
          <text class="amount" :class="item.recordType === 'received' ? 'income' : 'expense'">
            {{ item.recordType === 'received' ? '+' : '-' }}¥{{ item.amount }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      contactId: '',
      name: '',
      records: []
    };
  },
  onLoad(options) {
    if (options.id) {
      this.contactId = options.id;
      this.name = options.name;
    }
  },
  onShow() {
    if (this.name) {
      this.fetchRecords();
    }
  },
  methods: {
    async fetchRecords() {
      try {
        // 使用后端提供的按联系人查询接口
        const res = await request({ 
          url: `/records/contact/${encodeURIComponent(this.name)}`
        });
        if (res.success) {
          this.records = res.data;
        }
      } catch (e) { console.error(e); }
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString();
    },
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header-card {
  background-color: #fff;
  padding: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
  
  .avatar-large {
    width: 160rpx;
    height: 160rpx;
    background-color: #3cc51f;
    color: #fff;
    border-radius: 50%;
    font-size: 60rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20rpx;
    font-weight: bold;
  }
  
  .name {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
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
    padding: 30rpx;
    border-radius: 12rpx;
    margin-bottom: 2rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .ledger-name {
      font-size: 30rpx;
      color: #333;
      margin-bottom: 10rpx;
    }
    
    .date {
      font-size: 24rpx;
      color: #999;
    }
    
    .amount {
      font-size: 32rpx;
      font-weight: bold;
      
      &.income { color: #ff5a5f; }
      &.expense { color: #3cc51f; }
    }
  }
}
</style>
