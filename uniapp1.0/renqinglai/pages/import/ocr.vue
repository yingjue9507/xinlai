<template>
  <view class="container">
    <!-- Step 1: Select Ledger -->
    <view class="section">
      <view class="section-title">1. 选择存入账本</view>
      <picker mode="selector" :range="ledgers" range-key="name" @change="onLedgerChange">
        <view class="picker-box">
          <text v-if="selectedLedger" class="selected-text">{{ selectedLedger.name }}</text>
          <text v-else class="placeholder">点击选择账本</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 功能入口 -->
    <view class="entry-grid" v-if="!batchMode && !cameraResult">
      <view class="entry-card camera" @click="startCameraMode">
        <view class="icon">📷</view>
        <view class="title">拍照识别</view>
        <view class="desc">拍一张，存一笔</view>
      </view>
      <view class="entry-card album" @click="startAlbumMode">
        <view class="icon">🖼️</view>
        <view class="title">相册导入</view>
        <view class="desc">批量上传，一次最多8张</view>
      </view>
    </view>

    <!-- 拍照模式结果确认弹窗 (模拟) -->
    <view class="camera-result-section" v-if="cameraResult">
      <view class="section-header">
        <text class="section-title">确认信息</text>
        <text class="close-btn" @click="closeCameraMode">取消</text>
      </view>
      <image :src="cameraResult.imagePath" mode="aspectFit" class="preview-img-large"></image>
      
      <view class="form-box">
        <view class="form-item">
          <text class="label">姓名</text>
          <input class="input" v-model="cameraResult.contactName" placeholder="识别结果" />
        </view>
        <view class="form-item">
          <text class="label">金额</text>
          <input class="input" type="number" v-model="cameraResult.amount" placeholder="0.00" />
        </view>
        <view class="form-item">
            <text class="label">类型</text>
            <view class="type-switch">
                <text :class="{active: !cameraResult.isGift}" @click="cameraResult.isGift = false">礼金</text>
                <text :class="{active: cameraResult.isGift}" @click="cameraResult.isGift = true">物品</text>
            </view>
        </view>
        <view class="form-item">
          <text class="label">备注</text>
          <input class="input" v-model="cameraResult.note" placeholder="备注或物品描述" />
        </view>
      </view>
      
      <button class="save-btn" @click="saveCameraResult">确认并保存</button>
      <button class="retry-btn" @click="startCameraMode">重新拍摄</button>
    </view>

    <!-- 相册批量模式 -->
    <view class="batch-section" v-if="batchMode">
      <view class="section-header">
        <text class="section-title">批量识别 ({{ batchImages.length }}/8)</text>
        <text class="close-btn" @click="exitBatchMode">退出</text>
      </view>

      <!-- 图片列表/添加 -->
      <view class="image-grid" v-if="!batchAnalyzed">
        <view class="grid-item" v-for="(img, index) in batchImages" :key="index">
          <image :src="img.path" mode="aspectFill" class="thumb"></image>
          <view class="remove-icon" @click="removeBatchImage(index)">×</view>
        </view>
        <view class="grid-item add-btn" v-if="batchImages.length < 8" @click="addBatchImages">
          <text class="plus">+</text>
        </view>
      </view>
      
      <button class="action-btn" v-if="!batchAnalyzed && batchImages.length > 0" @click="analyzeBatch" :loading="loading">
        {{ loading ? '正在逐张识别...' : '开始批量识别' }}
      </button>

      <!-- 识别结果列表 -->
      <view class="batch-results" v-if="batchAnalyzed">
        <view class="result-card" v-for="(item, index) in batchResults" :key="index">
           <view class="card-left">
               <image :src="item.imagePath" mode="aspectFill" class="mini-thumb"></image>
           </view>
           <view class="card-right">
               <view class="row">
                   <input class="input name" v-model="item.contactName" placeholder="姓名" />
                   <input class="input amount" type="number" v-model="item.amount" placeholder="金额" />
               </view>
               <view class="row">
                   <checkbox-group @change="(e) => onBatchItemTypeChange(e, index)" style="transform:scale(0.8)">
                        <label><checkbox :checked="item.isGift" color="#ff5a5f" />物品</label>
                   </checkbox-group>
                   <input class="input note" v-model="item.note" placeholder="备注" />
               </view>
           </view>
           <view class="delete-btn" @click="removeBatchResult(index)">×</view>
        </view>
        
        <button class="save-btn" @click="saveBatchResults">全部保存</button>
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
      ledgers: [],
      selectedLedger: null,
      loading: false,
      
      // 模式状态
      batchMode: false,
      
      // 拍照模式数据
      cameraResult: null, // { imagePath, contactName, amount, isGift, note }
      
      // 批量模式数据
      batchImages: [], // [{ path: '' }]
      batchResults: [], 
      batchAnalyzed: false
    };
  },
  onShow() {
    this.fetchLedgers();
  },
  methods: {
    async fetchLedgers() {
      try {
        const res = await request({ url: '/ledgers' });
        if (res.success) {
          this.ledgers = res.data;
          if (this.ledgers.length > 0 && !this.selectedLedger) {
             this.selectedLedger = this.ledgers[0];
          }
        }
      } catch (e) { 
        uni.showToast({ title: '获取账本列表失败', icon: 'none' });
      }
    },
    onLedgerChange(e) {
      this.selectedLedger = this.ledgers[e.detail.value];
    },
    
    // --- 拍照模式 ---
    startCameraMode() {
      if (!this.selectedLedger) return uni.showToast({ title: '请先选择账本', icon: 'none' });
      
      uni.chooseImage({
        count: 1,
        sourceType: ['camera'],
        success: (res) => {
          const filePath = res.tempFilePaths[0];
          this.analyzeSingleImage(filePath);
        }
      });
    },
    closeCameraMode() {
        this.cameraResult = null;
    },
    analyzeSingleImage(filePath) {
        uni.showLoading({ title: '智能识别中...' });
        const token = uni.getStorageSync('token');
        
        uni.uploadFile({
            url: config.baseUrl + '/ocr/analyze',
            filePath: filePath,
            name: 'image',
            header: { 'Authorization': token ? `Bearer ${token}` : '' },
            success: (uploadRes) => {
                uni.hideLoading();
                try {
                    const res = JSON.parse(uploadRes.data);
                    if (res.success && res.data && res.data.list && res.data.list.length > 0) {
                        const result = res.data.list[0];
                        this.cameraResult = {
                            imagePath: filePath,
                            contactName: result.contactName,
                            amount: result.amount,
                            isGift: false,
                            note: result.note || ''
                        };
                    } else {
                        // 识别失败也显示图片让用户手动填
                        this.cameraResult = {
                            imagePath: filePath,
                            contactName: '',
                            amount: '',
                            isGift: false,
                            note: ''
                        };
                        uni.showToast({ title: '未识别到内容，请手动填写', icon: 'none' });
                    }
                } catch (e) {
                    uni.showToast({ title: '解析失败', icon: 'none' });
                }
            },
            fail: () => {
                uni.hideLoading();
                uni.showToast({ title: '上传失败', icon: 'none' });
            }
        });
    },
    async saveCameraResult() {
        if (!this.cameraResult.contactName) return uni.showToast({ title: '请输入姓名', icon: 'none' });
        
        try {
            uni.showLoading({ title: '保存中...' });
            await this.saveRecord(this.cameraResult);
            uni.hideLoading();
            uni.showToast({ title: '保存成功' });
            this.cameraResult = null;
            // 询问是否继续拍照
            uni.showModal({
                title: '提示',
                content: '保存成功，是否继续拍摄下一张？',
                success: (res) => {
                    if (res.confirm) {
                        this.startCameraMode();
                    }
                }
            });
        } catch (e) {
            uni.hideLoading();
            uni.showToast({ title: '保存失败', icon: 'none' });
        }
    },
    
    // --- 批量模式 ---
    startAlbumMode() {
        if (!this.selectedLedger) return uni.showToast({ title: '请先选择账本', icon: 'none' });
        this.batchMode = true;
        this.batchImages = [];
        this.batchResults = [];
        this.batchAnalyzed = false;
        this.addBatchImages();
    },
    exitBatchMode() {
        this.batchMode = false;
        this.batchImages = [];
    },
    addBatchImages() {
        const remain = 8 - this.batchImages.length;
        if (remain <= 0) return;
        
        uni.chooseImage({
            count: remain,
            sourceType: ['album'],
            success: (res) => {
                const newImages = res.tempFilePaths.map(path => ({ path }));
                this.batchImages = [...this.batchImages, ...newImages];
            }
        });
    },
    removeBatchImage(index) {
        this.batchImages.splice(index, 1);
    },
    async analyzeBatch() {
        if (this.batchImages.length === 0) return;
        
        this.loading = true;
        this.batchResults = [];
        const token = uni.getStorageSync('token');
        
        // 串行处理，避免并发过大
        for (const img of this.batchImages) {
            try {
                const uploadRes = await new Promise((resolve, reject) => {
                    uni.uploadFile({
                        url: config.baseUrl + '/ocr/analyze',
                        filePath: img.path,
                        name: 'image',
                        header: { 'Authorization': token ? `Bearer ${token}` : '' },
                        success: resolve,
                        fail: reject
                    });
                });
                
                const res = JSON.parse(uploadRes.data);
                if (res.success && res.data && res.data.list && res.data.list.length > 0) {
                    const r = res.data.list[0];
                    this.batchResults.push({
                        imagePath: img.path,
                        contactName: r.contactName,
                        amount: r.amount,
                        isGift: false,
                        note: r.note || ''
                    });
                } else {
                    // 失败也占位
                    this.batchResults.push({
                        imagePath: img.path,
                        contactName: '',
                        amount: '',
                        isGift: false,
                        note: '识别失败'
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        this.loading = false;
        this.batchAnalyzed = true;
    },
    onBatchItemTypeChange(e, index) {
        this.batchResults[index].isGift = e.detail.value.length > 0;
    },
    removeBatchResult(index) {
        this.batchResults.splice(index, 1);
    },
    async saveBatchResults() {
        const validRecords = this.batchResults.filter(r => r.contactName);
        if (validRecords.length === 0) return uni.showToast({ title: '无有效数据', icon: 'none' });
        
        uni.showLoading({ title: '批量保存中...' });
        let successCount = 0;
        
        for (const item of validRecords) {
            try {
                await this.saveRecord(item);
                successCount++;
            } catch (e) {
                console.error(e);
            }
        }
        
        uni.hideLoading();
        uni.showToast({ title: `成功保存 ${successCount} 条` });
        
        setTimeout(() => {
            this.batchMode = false;
            this.batchImages = [];
            this.batchResults = [];
            // 跳转账本详情
            uni.navigateTo({
                url: `/pages/ledger/detail?id=${this.selectedLedger.id}`
            });
        }, 1500);
    },
    
    // --- 通用保存 ---
    saveRecord(item) {
        return request({
            url: '/records',
            method: 'POST',
            data: {
                ledgerId: this.selectedLedger.id,
                contactName: item.contactName,
                amount: parseFloat(item.amount) || 0,
                isGiftItem: item.isGift,
                giftDescription: item.isGift ? item.note : '',
                note: item.note,
                recordDate: new Date()
            }
        });
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

.section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  
  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
  
  .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      .close-btn { color: #999; font-size: 26rpx; }
  }
}

.picker-box {
  background-color: #f9f9f9;
  padding: 24rpx;
  border-radius: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1rpx solid #eee;
  
  .selected-text { color: #333; font-weight: bold; }
  .placeholder { color: #999; }
  .arrow { color: #ccc; }
}

/* 入口卡片 */
.entry-grid {
    display: flex;
    justify-content: space-between;
    
    .entry-card {
        width: 48%;
        background: #fff;
        border-radius: 20rpx;
        padding: 40rpx 20rpx;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
        
        .icon { font-size: 60rpx; margin-bottom: 20rpx; }
        .title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 10rpx; }
        .desc { font-size: 22rpx; color: #999; text-align: center; }
        
        &.camera:active { background: #fff0f0; }
        &.album:active { background: #f0f8ff; }
    }
}

/* 拍照结果页 */
.camera-result-section {
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    
    .preview-img-large {
        width: 100%;
        height: 400rpx;
        border-radius: 12rpx;
        margin-bottom: 30rpx;
        background: #000;
    }
    
    .form-box {
        .form-item {
            display: flex;
            align-items: center;
            margin-bottom: 20rpx;
            padding-bottom: 20rpx;
            border-bottom: 1rpx solid #f5f5f5;
            
            .label { width: 100rpx; color: #666; font-size: 28rpx; }
            .input { flex: 1; font-size: 30rpx; }
            
            .type-switch {
                display: flex;
                gap: 20rpx;
                text {
                    padding: 6rpx 20rpx;
                    background: #f0f2f5;
                    border-radius: 8rpx;
                    font-size: 26rpx;
                    color: #666;
                    &.active { background: #ff5a5f; color: #fff; }
                }
            }
        }
    }
    
    .save-btn { background: #3cc51f; color: #fff; border-radius: 44rpx; margin-bottom: 20rpx; }
    .retry-btn { background: #fff; color: #666; border: 1rpx solid #ddd; border-radius: 44rpx; }
}

/* 批量模式 */
.batch-section {
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    
    .image-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 20rpx;
        margin-bottom: 30rpx;
        
        .grid-item {
            width: 150rpx;
            height: 150rpx;
            position: relative;
            
            .thumb { width: 100%; height: 100%; border-radius: 12rpx; }
            .remove-icon {
                position: absolute; top: -10rpx; right: -10rpx;
                width: 40rpx; height: 40rpx; background: rgba(0,0,0,0.5);
                color: #fff; border-radius: 50%; text-align: center; line-height: 36rpx;
            }
            
            &.add-btn {
                border: 2rpx dashed #ccc;
                border-radius: 12rpx;
                display: flex;
                justify-content: center;
                align-items: center;
                .plus { font-size: 60rpx; color: #ccc; }
            }
        }
    }
    
    .action-btn { background: #3B82F6; color: #fff; border-radius: 44rpx; }
    
    .batch-results {
        .result-card {
            background: #f9f9f9;
            padding: 20rpx;
            border-radius: 12rpx;
            display: flex;
            margin-bottom: 20rpx;
            position: relative;
            
            .card-left {
                width: 100rpx;
                height: 100rpx;
                margin-right: 20rpx;
                .mini-thumb { width: 100%; height: 100%; border-radius: 8rpx; }
            }
            
            .card-right {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 10rpx;
                
                .row {
                    display: flex;
                    gap: 10rpx;
                    .input {
                        background: #fff; height: 50rpx; border: 1rpx solid #eee; padding: 0 10rpx; font-size: 24rpx; border-radius: 6rpx;
                        &.name { flex: 2; }
                        &.amount { flex: 1; }
                        &.note { flex: 3; }
                    }
                }
            }
            
            .delete-btn {
                position: absolute; top: 10rpx; right: 10rpx;
                color: #999; font-size: 30rpx;
            }
        }
        
        .save-btn { background: #3cc51f; color: #fff; border-radius: 44rpx; margin-top: 30rpx; }
    }
}
</style>
