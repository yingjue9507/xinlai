<template>
	<view class="container">
		<!-- 顶部导航 -->
		<view class="header">
			<view class="app-title">
				<text class="title-text">心来</text>
			</view>
			<view class="settings-icon" @click="goToSettings">
				<text class="icon">⚙️</text>
			</view>
		</view>

		<view class="main-content">
			<!-- 公告栏 -->
			<view class="announcement-banner">
				<view class="announcement-icon">📢</view>
				<swiper class="announcement-swiper" vertical autoplay circular interval="3000">
					<swiper-item v-for="(item, index) in announcements" :key="index">
						<view class="announcement-text">{{ item }}</view>
					</swiper-item>
				</swiper>
			</view>

			<!-- 统计卡片 (红包装饰) -->
			<view class="stats-card red-envelope">
				<view class="stats-header">
					<text class="stats-title">本月收支</text>
					<text class="stats-date">{{ currentDate }}</text>
				</view>
				<view class="stats-row">
					<view class="stats-item">
						<text class="label">收到礼金</text>
						<text class="value income">¥{{ stats.income || '0.00' }}</text>
					</view>
					<view class="divider"></view>
					<view class="stats-item">
						<text class="label">送出礼金</text>
						<text class="value expense">¥{{ stats.expense || '0.00' }}</text>
					</view>
				</view>
			</view>

			<!-- 功能网格 -->
			<view class="grid-menu">
				<view class="grid-item" @click="navTo('/pages/record/add')">
					<view class="icon-box bg-blue">📝</view>
					<text class="grid-text">记一笔</text>
				</view>
				<view class="grid-item" @click="navTo('/pages/ledger/create')">
					<view class="icon-box bg-purple">📒</view>
					<text class="grid-text">新建账本</text>
				</view>
				<view class="grid-item" @click="navTo('/pages/import/ocr')">
					<view class="icon-box bg-green">📷</view>
					<text class="grid-text">OCR识别</text>
				</view>
				<view class="grid-item" @click="navTo('/pages/notify/mass')">
					<view class="icon-box bg-orange">📨</view>
					<text class="grid-text">群发通知</text>
				</view>
				<view class="grid-item" @click="navTo('/pages/export/export')">
					<view class="icon-box bg-cyan">📊</view>
					<text class="grid-text">数据导出</text>
				</view>
				<view class="grid-item" @click="navTo('/pages/contact/list')">
					<view class="icon-box bg-pink">👥</view>
					<text class="grid-text">联系人</text>
				</view>
			</view>

			<!-- 最近记录列表 (简略) -->
			<view class="recent-section">
				<view class="section-header">
					<text class="section-title">最近记录</text>
					<text class="more-btn" @click="navTo('/pages/ledger/list')">查看全部 ></text>
				</view>
				<view class="record-list">
					<view class="empty-tip" v-if="recentRecords.length === 0">
						<text>暂无最近记录</text>
					</view>
					<view class="record-item" v-for="(item, index) in recentRecords" :key="index">
						<view class="left-info">
							<view class="avatar">{{ item.contactName[0] }}</view>
							<view class="text-info">
								<text class="name">{{ item.contactName }}</text>
								<text class="note">{{ item.note }}</text>
							</view>
						</view>
						<view class="right-info">
							<text class="amount" :class="item.type === 'received' ? 'income' : 'expense'">
								{{ item.type === 'received' ? '+' : '-' }}¥{{ item.amount }}
							</text>
							<text class="date">{{ item.date }}</text>
						</view>
					</view>
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
				currentDate: new Date().toLocaleDateString(),
				announcements: [
					'欢迎使用人情薄小程序！',
					'新功能：OCR智能识别上线啦',
					'数据安全提醒：请定期备份数据'
				],
				stats: {
					income: '0.00',
					expense: '0.00'
				},
				recentRecords: []
			};
		},
		onShow() {
			this.checkLogin();
			this.fetchData();
		},
		methods: {
			checkLogin() {
				const token = uni.getStorageSync('token');
				if (!token) {
					uni.reLaunch({
						url: '/pages/login/login'
					});
				}
			},
			async fetchData() {
				try {
					const res = await request({ url: '/ledgers/home-stats' });
					if (res.success) { 
						this.stats = {
							income: res.data.totalReceived.toFixed(2),
							expense: res.data.totalGiven.toFixed(2)
						};
					}
					
					// 获取最近记录
					const recordsRes = await request({ 
						url: '/records/recent?limit=5'
					});
					if (recordsRes.success) {
						this.recentRecords = recordsRes.data.map(item => {
							const date = new Date(item.recordDate);
							return {
								contactName: item.contactName,
								// 格式化日期为 YYYY-MM-DD
								date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
								amount: item.amount,
								type: item.recordType,
								note: item.note || item.giftDescription || (item.isGiftItem ? '物品' : '礼金')
							};
						});
					}
				} catch (e) {
					console.error('Fetch home data failed', e);
				}
			},
			navTo(url) {
				const tabBarPages = [
					'/pages/home/home',
					'/pages/ledger/list',
					'/pages/contact/list',
					'/pages/settings/settings'
				];
				
				if (tabBarPages.includes(url)) {
					uni.switchTab({ url });
				} else {
					uni.navigateTo({ url });
				}
			},
			goToSettings() {
				uni.switchTab({
					url: '/pages/settings/settings'
				});
			}
		}
	};
</script>

<style lang="scss">
	.container {
		min-height: 100vh;
		background-color: #f5f7fa;
	}

	.header {
		background-color: #ffffff;
		padding: 20rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #eee;
		/* 适配状态栏高度，通常 App 需要，H5 不需要太在意 */
		/* padding-top: var(--status-bar-height); */

		.app-title {
			font-size: 36rpx;
			font-weight: bold;
			color: #333;
		}

		.settings-icon {
			font-size: 40rpx;
			padding: 10rpx;
		}
	}

	.main-content {
		padding: 30rpx;
	}

	.announcement-banner {
		background: #fff;
		border-radius: 20rpx;
		padding: 20rpx;
		display: flex;
		align-items: center;
		margin-bottom: 30rpx;
		box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.05);

		.announcement-icon {
			margin-right: 20rpx;
		}

		.announcement-swiper {
			flex: 1;
			height: 40rpx;
			
			.announcement-text {
				font-size: 28rpx;
				color: #666;
				line-height: 40rpx;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}

	.stats-card {
		background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
		border-radius: 30rpx;
		padding: 40rpx;
		color: #fff;
		margin-bottom: 40rpx;
		box-shadow: 0 10rpx 20rpx rgba(220, 38, 38, 0.3);

		.stats-header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 30rpx;
			
			.stats-title {
				font-size: 32rpx;
				font-weight: bold;
			}
			.stats-date {
				font-size: 24rpx;
				opacity: 0.8;
			}
		}

		.stats-row {
			display: flex;
			align-items: center;
			
			.stats-item {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				
				.label {
					font-size: 24rpx;
					opacity: 0.9;
					margin-bottom: 10rpx;
				}
				
				.value {
					font-size: 40rpx;
					font-weight: bold;
				}
			}
			
			.divider {
				width: 2rpx;
				height: 60rpx;
				background: rgba(255,255,255,0.3);
			}
		}
	}

	.grid-menu {
		display: flex;
		flex-wrap: wrap;
		background: #fff;
		border-radius: 30rpx;
		padding: 30rpx 0;
		margin-bottom: 30rpx;
		box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.05);

		.grid-item {
			width: 33.33%;
			display: flex;
			flex-direction: column;
			align-items: center;
			margin-bottom: 30rpx;
			
			.icon-box {
				width: 90rpx;
				height: 90rpx;
				border-radius: 25rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 40rpx;
				margin-bottom: 10rpx;
				
				&.bg-blue { background: #EEF2FF; color: #3B82F6; }
				&.bg-purple { background: #F3E8FF; color: #8B5CF6; }
				&.bg-green { background: #ECFDF5; color: #10B981; }
				&.bg-orange { background: #FFF7ED; color: #F97316; }
				&.bg-cyan { background: #ECFEFF; color: #06B6D4; }
				&.bg-pink { background: #FDF2F8; color: #EC4899; }
			}
			
			.grid-text {
				font-size: 26rpx;
				color: #333;
			}
		}
	}

	.recent-section {
		background: #fff;
		border-radius: 30rpx;
		padding: 30rpx;
		
		.section-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;
			
			.section-title {
				font-size: 32rpx;
				font-weight: bold;
				color: #333;
			}
			
			.more-btn {
				font-size: 26rpx;
				color: #999;
			}
		}
		
		.empty-tip {
			text-align: center;
			padding: 40rpx 0;
			color: #999;
			font-size: 28rpx;
		}
		
		.record-list {
			.record-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 24rpx 0;
				border-bottom: 1rpx solid #f5f5f5;
				
				&:last-child {
					border-bottom: none;
				}
				
				.left-info {
					display: flex;
					align-items: center;
					
					.avatar {
						width: 80rpx;
						height: 80rpx;
						background: #f0f2f5;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						margin-right: 20rpx;
						font-size: 32rpx;
						color: #666;
						font-weight: bold;
					}
					
					.text-info {
						display: flex;
						flex-direction: column;
						
						.name {
							font-size: 30rpx;
							color: #333;
							font-weight: 500;
							margin-bottom: 6rpx;
						}
						
						.note {
							font-size: 24rpx;
							color: #999;
							max-width: 300rpx;
							overflow: hidden;
							text-overflow: ellipsis;
							white-space: nowrap;
						}
					}
				}
				
				.right-info {
					display: flex;
					flex-direction: column;
					align-items: flex-end;
					
					.amount {
						font-size: 32rpx;
						font-weight: bold;
						margin-bottom: 6rpx;
						
						&.income { color: #EF4444; }
						&.expense { color: #10B981; }
					}
					
					.date {
						font-size: 24rpx;
						color: #999;
					}
				}
			}
		}
	}
</style>
