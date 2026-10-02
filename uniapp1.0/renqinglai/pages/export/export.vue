<template>
  <view class="container">
    <view class="header">
      <text class="title">数据导出</text>
      <text class="subtitle">将您的数据导出为 Excel 文件，方便在电脑上查看和备份</text>
    </view>

    <view class="export-options">
      <!-- 导出所有账本 -->
      <view class="option-card" @click="handleExport('all-ledgers')">
        <view class="icon-box bg-blue">📚</view>
        <view class="info">
          <text class="option-title">所有账本数据</text>
          <text class="option-desc">导出包含所有账本的完整记录</text>
        </view>
        <text class="arrow">></text>
      </view>

      <!-- 导出指定账本 -->
      <picker mode="selector" :range="ledgers" range-key="name" @change="onLedgerChange">
        <view class="option-card">
          <view class="icon-box bg-purple">📒</view>
          <view class="info">
            <text class="option-title">指定账本数据</text>
            <text class="option-desc">选择一个特定账本进行导出</text>
          </view>
          <text class="arrow">></text>
        </view>
      </picker>

      <!-- 导出联系人 -->
      <view class="option-card" @click="handleExport('contacts')">
        <view class="icon-box bg-green">👥</view>
        <view class="info">
          <text class="option-title">联系人统计</text>
          <text class="option-desc">导出联系人名单及往来汇总</text>
        </view>
        <text class="arrow">></text>
      </view>

      <!-- 导出统计报表 -->
      <view class="option-card" @click="handleExport('statistics')">
        <view class="icon-box bg-orange">📊</view>
        <view class="info">
          <text class="option-title">综合统计报表</text>
          <text class="option-desc">导出收支概览及多维分析报表</text>
        </view>
        <text class="arrow">></text>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';
import config from '@/common/config.js';

export default {
  data() {
    return {
      ledgers: []
    };
  },
  onLoad() {
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
      }
    },
    onLedgerChange(e) {
      const index = e.detail.value;
      const ledger = this.ledgers[index];
      if (ledger) {
        this.handleExport('ledger', ledger.id);
      }
    },
    async handleExport(type, id = null) {
      uni.showLoading({ title: '正在生成文件...' });
      
      try {
        let url = '';
        if (type === 'all-ledgers') url = '/export/all-ledgers';
        else if (type === 'ledger') url = `/export/ledger/${id}`;
        else if (type === 'contacts') url = '/export/contacts';
        else if (type === 'statistics') url = '/export/statistics';
        
        // 拼接完整下载地址 (需要携带 token)
        const token = uni.getStorageSync('token');
        // 注意：这里我们使用 downloadFile 而不是 request，因为是文件流
        // 但为了简单起见，且后端验证是 header token，downloadFile header 支持有限
        // 如果是 H5，可以直接 window.open 携带 query param token (不安全)
        // 更好的方式：先请求生成文件，返回 url，再下载。
        // 但现有后端直接返回流。
        
        // 方案：使用 uni.downloadFile 并带上 header
        uni.downloadFile({
          url: config.baseUrl + '/api' + url,
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (res) => {
            if (res.statusCode === 200) {
              const tempFilePath = res.tempFilePath;
              
              // H5 平台特殊处理
              // #ifdef H5
              this.saveFileH5(tempFilePath, `export_${type}.xlsx`);
              // #endif
              
              // APP/小程序平台
              // #ifndef H5
              uni.saveFile({
                tempFilePath,
                success: (saveRes) => {
                  uni.showToast({
                    title: '导出成功，已保存',
                    icon: 'success'
                  });
                  // 尝试打开文件
                  uni.openDocument({
                    filePath: saveRes.savedFilePath,
                    showMenu: true
                  });
                },
                fail: (err) => {
                   uni.showToast({ title: '保存文件失败', icon: 'none' });
                }
              });
              // #endif
            } else {
              uni.showToast({ title: '导出失败', icon: 'none' });
            }
          },
          fail: (err) => {
            console.error(err);
            uni.showToast({ title: '请求失败', icon: 'none' });
          },
          complete: () => {
            uni.hideLoading();
          }
        });
        
      } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: '操作异常', icon: 'none' });
      }
    },
    // H5 保存文件辅助方法
    saveFileH5(url, fileName) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      uni.showToast({ title: '已开始下载', icon: 'success' });
    }
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
}

.header {
  margin-bottom: 40rpx;
  
  .title {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 10rpx;
  }
  
  .subtitle {
    font-size: 26rpx;
    color: #666;
  }
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.option-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.02);
  
  &:active {
    background-color: #f9f9f9;
  }
  
  .icon-box {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36rpx;
    margin-right: 24rpx;
    
    &.bg-blue { background: #EEF2FF; color: #3B82F6; }
    &.bg-purple { background: #F3E8FF; color: #8B5CF6; }
    &.bg-green { background: #ECFDF5; color: #10B981; }
    &.bg-orange { background: #FFF7ED; color: #F97316; }
  }
  
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .option-title {
      font-size: 30rpx;
      font-weight: 500;
      color: #333;
      margin-bottom: 6rpx;
    }
    
    .option-desc {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .arrow {
    color: #ccc;
    font-size: 30rpx;
  }
}
</style>
