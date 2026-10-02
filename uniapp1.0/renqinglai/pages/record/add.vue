<template>
  <view class="container">
    <view class="form-item">
      <text class="label">所属账本</text>
      <picker v-if="!fixedLedgerId" mode="selector" :range="ledgers" range-key="name" @change="onLedgerChange">
        <view class="picker-box">
           <text v-if="selectedLedger" class="selected-text">{{ selectedLedger.name }}</text>
           <text v-else class="placeholder">点击选择账本</text>
           <text class="arrow">▼</text>
        </view>
      </picker>
      <text v-else class="value">{{ ledgerName }}</text>
    </view>
    
    <view class="form-item">
      <text class="label">类型</text>
      <view class="type-switch">
        <view class="type-btn" :class="{ active: form.recordType === 'received' }" @click="form.recordType = 'received'">收礼</view>
        <view class="type-btn" :class="{ active: form.recordType === 'sent' }" @click="form.recordType = 'sent'">送礼</view>
      </view>
    </view>
    
    <view class="form-item">
      <text class="label">联系人</text>
      <input class="input" v-model="form.contactName" placeholder="请输入姓名" />
    </view>
    
    <view class="form-item">
      <text class="label">金额</text>
      <input class="input" type="number" v-model="form.amount" placeholder="0.00" />
    </view>
    
    <view class="form-item">
      <text class="label">是否礼品</text>
      <switch :checked="form.isGiftItem" @change="onGiftChange" color="#ff5a5f" />
    </view>
    
    <view class="form-item" v-if="form.isGiftItem">
      <text class="label">礼品描述</text>
      <input class="input" v-model="form.giftDescription" placeholder="如: 四件套" />
    </view>
    
    <view class="form-item">
      <text class="label">备注</text>
      <input class="input" v-model="form.note" placeholder="选填" />
    </view>
    
    <button class="submit-btn" @click="submit">保存记录</button>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      fixedLedgerId: '', // If passed from ledger detail
      ledgerName: '',
      ledgers: [],       // All ledgers list
      selectedLedger: null,
      form: {
        recordType: 'received',
        contactName: '',
        amount: '',
        isGiftItem: false,
        giftDescription: '',
        note: ''
      }
    };
  },
  onLoad(options) {
    if (options.ledgerId) {
      this.fixedLedgerId = options.ledgerId;
      this.ledgerName = options.ledgerName || '未知账本';
    } else {
      // If entered from "记一笔" menu, fetch all ledgers
      this.fetchLedgers();
    }
  },
  methods: {
    async fetchLedgers() {
      try {
        const res = await request({ url: '/ledgers' });
        if (res.success) {
           this.ledgers = res.data;
           if (this.ledgers.length > 0) {
               this.selectedLedger = this.ledgers[0];
           }
        }
      } catch (e) {
          console.error(e);
          uni.showToast({ title: '获取账本失败', icon: 'none' });
      }
    },
    onLedgerChange(e) {
        this.selectedLedger = this.ledgers[e.detail.value];
    },
    onGiftChange(e) {
      this.form.isGiftItem = e.detail.value;
    },
    async submit() {
      const targetLedgerId = this.fixedLedgerId || (this.selectedLedger ? this.selectedLedger.id : '');
      
      if (!targetLedgerId) {
          uni.showToast({ title: '请选择账本', icon: 'none' });
          return;
      }
      if (!this.form.contactName) {
        uni.showToast({ title: '请输入联系人', icon: 'none' });
        return;
      }
      if (!this.form.amount) {
        uni.showToast({ title: '请输入金额', icon: 'none' });
        return;
      }
      
      try {
        const res = await request({
          url: '/records',
          method: 'POST',
          data: {
            ledgerId: targetLedgerId,
            recordType: this.form.recordType,
            contactName: this.form.contactName,
            amount: parseFloat(this.form.amount),
            isGiftItem: this.form.isGiftItem,
            giftDescription: this.form.giftDescription,
            note: this.form.note,
            recordDate: new Date()
          }
        });
        
        if (res.success) {
          uni.showToast({ title: '记录成功' });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (e) { console.error(e); }
    }
  }
};
</script>

<style lang="scss">
.container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.form-item {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  
  .label {
    width: 160rpx;
    font-size: 30rpx;
    color: #333;
  }
  
  .value {
    font-size: 30rpx;
    color: #666;
  }
  
  .input {
    flex: 1;
    font-size: 30rpx;
    color: #333;
  }
}

.picker-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .selected-text {
    font-size: 30rpx;
    color: #333;
  }
  
  .placeholder {
    font-size: 30rpx;
    color: #999;
  }
  
  .arrow {
    font-size: 24rpx;
    color: #ccc;
    margin-left: 10rpx;
  }
}

.type-switch {
  display: flex;
  background-color: #f0f2f5;
  border-radius: 8rpx;
  padding: 4rpx;
  
  .type-btn {
    padding: 10rpx 30rpx;
    font-size: 28rpx;
    color: #666;
    border-radius: 6rpx;
    
    &.active {
      background-color: #ff5a5f;
      color: #fff;
      font-weight: bold;
    }
  }
}

.submit-btn {
  margin-top: 60rpx;
  background-color: #ff5a5f;
  color: #fff;
  border-radius: 45rpx;
}
</style>
