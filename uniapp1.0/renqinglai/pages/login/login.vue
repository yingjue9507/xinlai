<template>
	<view class="container">
		<!-- 顶部背景 -->
		<view class="header-bg">
			<view class="circle-1"></view>
			<view class="circle-2"></view>
		</view>

		<view class="content">
			<!-- Logo -->
			<view class="logo-section">
				<view class="logo-box">
					<image src="/static/logo.png" mode="aspectFit" class="logo-img"></image>
				</view>
				<text class="app-name">人情薄</text>
				<text class="app-slogan">让人情往来更简单</text>
			</view>

			<!-- 切换 Tab -->
			<view class="tabs">
				<view class="tab-item" :class="{ active: isLogin }" @click="isLogin = true">登录</view>
				<view class="tab-item" :class="{ active: !isLogin }" @click="isLogin = false">注册</view>
			</view>

			<!-- 表单 -->
			<view class="form-card">
				<!-- 手机号 -->
				<view class="input-group">
					<text class="label">手机号</text>
					<input class="input" type="number" v-model="formData.phoneNumber" placeholder="请输入手机号" maxlength="11" />
				</view>

				<!-- 密码 -->
				<view class="input-group">
					<text class="label">密码</text>
					<input class="input" type="password" v-model="formData.password" placeholder="请输入密码 (至少6位)" />
				</view>

				<!-- 按钮 -->
				<button class="submit-btn" @click="handleSubmit">{{ isLogin ? '登 录' : '注 册' }}</button>
			</view>
		</view>
	</view>
</template>

<script>
	import request from '@/common/request.js';

	export default {
		data() {
			return {
				isLogin: true,
				formData: {
					phoneNumber: '',
					password: ''
				}
			};
		},
		methods: {
			async handleSubmit() {
				if (!this.formData.phoneNumber || !this.formData.password) {
					uni.showToast({
						title: '请填写完整信息',
						icon: 'none'
					});
					return;
				}

				const url = this.isLogin ? '/auth/login' : '/auth/register';
				
				try {
					const res = await request({
						url: url,
						method: 'POST',
						data: this.formData
					});

					if (res.success) {
						uni.showToast({
							title: this.isLogin ? '登录成功' : '注册成功',
							icon: 'success'
						});
						
						if (res.data && res.data.token) {
							uni.setStorageSync('token', res.data.token);
							uni.setStorageSync('user', res.data.user);
							
							// 登录成功跳转首页
							setTimeout(() => {
								uni.switchTab({
									url: '/pages/home/home'
								});
							}, 1000);
						} else if (!this.isLogin) {
							// 注册成功自动切换到登录
							this.isLogin = true;
						}
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
		min-height: 100vh;
		background-color: #f5f7fa;
		position: relative;
		overflow: hidden;
	}

	.header-bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 400rpx;
		background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
		border-bottom-left-radius: 60rpx;
		border-bottom-right-radius: 60rpx;
		z-index: 0;

		.circle-1 {
			position: absolute;
			top: -50rpx;
			left: -50rpx;
			width: 200rpx;
			height: 200rpx;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 50%;
		}

		.circle-2 {
			position: absolute;
			bottom: 50rpx;
			right: -20rpx;
			width: 150rpx;
			height: 150rpx;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 50%;
		}
	}

	.content {
		position: relative;
		z-index: 1;
		padding: 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.logo-section {
		margin-top: 100rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 60rpx;

		.logo-box {
			width: 160rpx;
			height: 160rpx;
			background: #ffffff;
			border-radius: 40rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.1);
			margin-bottom: 20rpx;
			
			.logo-img {
				width: 100rpx;
				height: 100rpx;
			}
		}

		.app-name {
			font-size: 48rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 10rpx;
		}

		.app-slogan {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.8);
		}
	}

	.tabs {
		display: flex;
		background: rgba(255, 255, 255, 0.9);
		padding: 10rpx;
		border-radius: 50rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.05);

		.tab-item {
			padding: 15rpx 60rpx;
			border-radius: 40rpx;
			font-size: 30rpx;
			color: #666;
			transition: all 0.3s;

			&.active {
				background: #3B82F6;
				color: #fff;
				font-weight: bold;
			}
		}
	}

	.form-card {
		width: 100%;
		background: #ffffff;
		border-radius: 30rpx;
		padding: 40rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);

		.input-group {
			margin-bottom: 30rpx;

			.label {
				display: block;
				font-size: 28rpx;
				color: #333;
				margin-bottom: 15rpx;
				font-weight: 500;
			}

			.input {
				width: 100%;
				height: 90rpx;
				background: #f5f7fa;
				border-radius: 15rpx;
				padding: 0 30rpx;
				font-size: 30rpx;
				box-sizing: border-box;
				
				&:focus {
					border: 2rpx solid #3B82F6;
					background: #fff;
				}
			}
		}

		.submit-btn {
			margin-top: 50rpx;
			width: 100%;
			height: 90rpx;
			background: linear-gradient(90deg, #3B82F6, #2563EB);
			color: #fff;
			border-radius: 45rpx;
			font-size: 32rpx;
			font-weight: bold;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 10rpx 20rpx rgba(59, 130, 246, 0.3);
			
			&:active {
				opacity: 0.9;
				transform: scale(0.98);
			}
		}
	}
</style>
