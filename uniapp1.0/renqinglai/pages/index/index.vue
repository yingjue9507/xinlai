<template>
	<view class="content">
		<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
		<view class="text-area">
			<text class="title">人情薄</text>
			<text class="subtitle">记录每一份温暖</text>
		</view>
		<view class="loading">
			<text class="loading-text">正在启动...</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				title: '人情薄'
			}
		},
		onShow() {
			// 模拟启动加载过程，检查登录状态
			setTimeout(() => {
				this.checkLogin();
			}, 1500);
		},
		methods: {
			checkLogin() {
				const token = uni.getStorageSync('token');
				if (token) {
					// 已登录，跳转到首页
					uni.switchTab({
						url: '/pages/home/home'
					});
				} else {
					// 未登录，跳转到登录页
					// 使用 reLaunch 关闭启动页，避免用户返回回到启动页
					uni.reLaunch({
						url: '/pages/login/login'
					});
				}
			}
		}
	}
</script>

<style lang="scss">
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background-color: #ffffff;
	}

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-bottom: 40rpx;
	}

	.text-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 100rpx;
	}

	.title {
		font-size: 48rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
	}
	
	.subtitle {
		font-size: 28rpx;
		color: #999;
		letter-spacing: 4rpx;
	}
	
	.loading {
		position: absolute;
		bottom: 100rpx;
		
		.loading-text {
			font-size: 24rpx;
			color: #ccc;
		}
	}
</style>
