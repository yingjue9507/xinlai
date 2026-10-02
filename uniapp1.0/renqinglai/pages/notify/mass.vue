<template>
  <view class="container">
    <!-- 步骤1: 编辑消息 -->
    <view class="section">
      <view class="section-title">1. 编辑邀请函内容</view>
      
      <!-- 模板选择 -->
      <scroll-view scroll-x class="template-scroll">
        <view class="template-item" 
              v-for="(tpl, index) in templates" 
              :key="index"
              @click="applyTemplate(tpl)">
          <text class="tpl-name">{{ tpl.name }}</text>
        </view>
      </scroll-view>
      
      <textarea 
        class="message-input" 
        v-model="message" 
        placeholder="请输入或选择邀请函内容..." 
        maxlength="500"
      />
      <view class="input-tip">内容将以短信形式发送</view>
    </view>

    <!-- 步骤2: 导入通讯录 -->
    <view class="section">
      <view class="section-header">
        <view class="header-left">
          <text class="section-title">2. 选择接收人</text>
          <text class="count" v-if="recipients.length">({{ selectedCount }}/{{ recipients.length }})</text>
        </view>
        <view class="actions">
           <button class="import-btn" size="mini" @click="importContacts">读取手机通讯录</button>
           <view class="select-all" @click="toggleSelectAll" v-if="recipients.length > 0">
             <text>{{ isAllSelected ? '取消全选' : '全选' }}</text>
           </view>
        </view>
      </view>
      
      <scroll-view scroll-y class="recipient-list" v-if="recipients.length > 0">
        <checkbox-group @change="onRecipientChange">
          <label class="recipient-item" v-for="(item, index) in recipients" :key="index">
            <checkbox :value="String(index)" :checked="item.checked" color="#ff5a5f" style="transform:scale(0.8)" />
            <view class="recipient-info">
              <text class="name">{{ item.displayName }}</text>
              <text class="phone">{{ item.phoneNumber }}</text>
            </view>
          </label>
        </checkbox-group>
      </scroll-view>
      <view v-else class="empty-tip">
        <text>点击上方按钮获取通讯录联系人</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button class="send-btn" @click="sendNotification" :disabled="selectedCount === 0 || !message">
        一键群发 ({{ selectedCount }}人)
      </button>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

export default {
  data() {
    return {
      recipients: [],
      templates: [],
      message: ''
    };
  },
  computed: {
    selectedCount() {
      return this.recipients.filter(r => r.checked).length;
    },
    isAllSelected() {
      return this.recipients.length > 0 && this.selectedCount === this.recipients.length;
    }
  },
  onLoad() {
    this.fetchTemplates();
  },
  methods: {
    async fetchTemplates() {
      try {
        const res = await request({ url: '/notifications/templates' });
        if (res.success) {
          this.templates = res.data;
        }
      } catch (e) { console.error(e); }
    },
    importContacts() {
      // #ifdef APP-PLUS
      this.getPhoneContacts();
      // #endif
      
      // #ifndef APP-PLUS
      this.getMockContacts();
      // #endif
    },
    getPhoneContacts() {
      // APP端调用通讯录
      // 注意：需要并在 manifest.json 中配置通讯录权限
      uni.getContacts({
        success: (res) => {
          this.recipients = res.contacts.map(c => ({
            displayName: c.displayName,
            phoneNumber: c.phoneNumbers[0]?.value || '',
            checked: true
          })).filter(c => c.phoneNumber); // 过滤掉无号码的
          
          if (this.recipients.length === 0) {
            uni.showToast({ title: '通讯录为空或无权限', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error(err);
          uni.showModal({
            title: '获取失败',
            content: '无法读取通讯录，请检查APP权限设置',
            showCancel: false
          });
        }
      });
    },
    getMockContacts() {
      // H5/开发环境模拟数据
      uni.showToast({ title: '模拟读取通讯录', icon: 'none' });
      setTimeout(() => {
        this.recipients = [
          { displayName: '张三', phoneNumber: '13800138000', checked: true },
          { displayName: '李四', phoneNumber: '13900139000', checked: true },
          { displayName: '王五', phoneNumber: '13700137000', checked: true },
          { displayName: '赵六', phoneNumber: '13600136000', checked: true },
          { displayName: '孙七', phoneNumber: '13500135000', checked: true },
          { displayName: '周八', phoneNumber: '13400134000', checked: true }
        ];
      }, 500);
    },
    toggleSelectAll() {
      const targetStatus = !this.isAllSelected;
      this.recipients.forEach(item => item.checked = targetStatus);
    },
    onRecipientChange(e) {
      const selectedIndices = new Set(e.detail.value);
      this.recipients.forEach((item, index) => {
        item.checked = selectedIndices.has(String(index));
      });
    },
    applyTemplate(tpl) {
      this.message = tpl.content;
    },
    async sendNotification() {
      if (this.selectedCount === 0) return;
      if (!this.message) return;
      
      const targetRecipients = this.recipients.filter(r => r.checked);
      
      uni.showLoading({ title: '发送中...' });
      try {
        // 调用后端接口记录发送日志 (模拟发送)
        const res = await request({
          url: '/notifications/send',
          method: 'POST',
          data: {
            recipients: targetRecipients.map(r => ({ name: r.displayName, phoneNumber: r.phoneNumber })),
            message: this.message
          }
        });
        
        if (res.success) {
          uni.hideLoading();
          uni.showModal({
            title: '发送成功',
            content: `已成功向 ${this.selectedCount} 位联系人发送短信通知`,
            showCancel: false
          });
          
          // 可选：如果是在APP端，可以尝试调用系统短信界面 (但群发通常受限)
          // #ifdef APP-PLUS
          // uni.sendSMS({
          //   phoneNumbers: targetRecipients.map(r => r.phoneNumber),
          //   content: this.message
          // });
          // #endif
        }
      } catch (e) {
        uni.hideLoading();
        console.error(e);
        uni.showToast({ title: '发送失败', icon: 'none' });
      }
    }
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
  padding-bottom: 120rpx;
}

.section {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.02);
  
  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
    display: block;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .header-left {
        display: flex;
        align-items: center;
        
        .section-title { margin-bottom: 0; }
        .count { font-size: 26rpx; color: #666; margin-left: 10rpx; }
    }
    
    .actions {
        display: flex;
        align-items: center;
        
        .import-btn {
            background-color: #EEF2FF;
            color: #3B82F6;
            font-size: 24rpx;
            margin-right: 20rpx;
            border: none;
            &::after { border: none; }
        }
        
        .select-all {
          font-size: 26rpx;
          color: #ff5a5f;
          padding: 10rpx;
        }
    }
  }
}

.recipient-list {
  max-height: 500rpx;
  
  .recipient-item {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    
    &:last-child { border-bottom: none; }
    
    .recipient-info {
      margin-left: 20rpx;
      display: flex;
      flex-direction: column;
      
      .name { font-size: 28rpx; color: #333; }
      .phone { font-size: 24rpx; color: #999; }
    }
  }
}

.template-scroll {
  white-space: nowrap;
  margin-bottom: 20rpx;
  
  .template-item {
    display: inline-block;
    background: #f0f2f5;
    padding: 12rpx 24rpx;
    border-radius: 30rpx;
    margin-right: 20rpx;
    
    .tpl-name { font-size: 24rpx; color: #666; }
    
    &:active { background: #e1e4e8; }
  }
}

.message-input {
  width: 100%;
  height: 240rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.input-tip {
  font-size: 22rpx;
  color: #999;
  margin-top: 10rpx;
  text-align: right;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  
  .send-btn {
    background: #ff5a5f;
    color: #fff;
    border-radius: 44rpx;
    font-size: 32rpx;
    
    &[disabled] {
      background: #ffb4b6;
      color: #fff;
    }
  }
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
  font-size: 26rpx;
  background-color: #f9f9f9;
  border-radius: 10rpx;
}
</style>
