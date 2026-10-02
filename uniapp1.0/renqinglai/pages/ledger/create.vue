<template>
  <view class="container">
    <view class="form-item">
      <text class="label">账本名称</text>
      <input class="input" v-model="form.ledgerName" placeholder="请输入账本名称(如: 结婚)" />
    </view>
    
    <view class="form-item">
      <text class="label">类型</text>
      <radio-group @change="onTypeChange" class="radio-group">
        <label class="radio">
          <radio value="received" :checked="form.ledgerType === 'received'" color="#ff5a5f" />收礼
        </label>
        <label class="radio">
          <radio value="given" :checked="form.ledgerType === 'given'" color="#ff5a5f" />送礼
        </label>
      </radio-group>
    </view>
    
    <view class="form-item">
      <text class="label">事由</text>
      <picker mode="selector" :range="occasions" @change="onOccasionChange">
        <view class="picker">
          {{ form.occasion || '请选择事由' }}
        </view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">日期</text>
      <picker mode="date" :value="form.creationDate" @change="onDateChange">
        <view class="picker">
          {{ form.creationDate }}
        </view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">备注</text>
      <textarea class="textarea" v-model="form.description" placeholder="请输入备注信息" />
    </view>
    
    <button class="submit-btn" @click="submit">创建账本</button>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      form: {
        ledgerName: '',
        ledgerType: 'received',
        occasion: '',
        creationDate: new Date().toISOString().split('T')[0],
        description: ''
      },
      occasions: ['结婚', '生日', '满月', '乔迁', '祝寿', '丧事', '其他']
    };
  },
  methods: {
    onTypeChange(e) {
      this.form.ledgerType = e.detail.value;
    },
    onOccasionChange(e) {
      this.form.occasion = this.occasions[e.detail.value];
    },
    onDateChange(e) {
      this.form.creationDate = e.detail.value;
    },
    async submit() {
      if (!this.form.ledgerName) {
        uni.showToast({ title: '请输入账本名称', icon: 'none' });
        return;
      }
      if (!this.form.occasion) {
        uni.showToast({ title: '请选择事由', icon: 'none' });
        return;
      }
      
      try {
        const res = await request({
          url: '/ledgers',
          method: 'POST',
          data: {
            ...this.form,
            creationDate: new Date(this.form.creationDate)
          }
        });
        
        if (res.success) {
          uni.showToast({ title: '创建成功' });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (e) {
        console.error(e);
      }
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
  
  .input, .picker, .textarea {
    flex: 1;
    font-size: 30rpx;
    color: #333;
  }
  
  .radio-group {
    display: flex;
    
    .radio {
      margin-right: 40rpx;
      display: flex;
      align-items: center;
    }
  }
  
  .textarea {
    height: 160rpx;
    padding-top: 10rpx;
  }
}

.submit-btn {
  margin-top: 60rpx;
  background-color: #ff5a5f;
  color: #fff;
  border-radius: 45rpx;
}
</style>
