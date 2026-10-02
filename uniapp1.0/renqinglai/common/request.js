import config from './config.js';

const request = (options) => {
	return new Promise((resolve, reject) => {
		const token = uni.getStorageSync('token');
		
		uni.request({
			url: config.baseUrl + options.url,
			method: options.method || 'GET',
			data: options.data || {},
			header: {
				'Content-Type': 'application/json',
				'Authorization': token ? `Bearer ${token}` : ''
			},
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data);
				} else {
					console.error('Request Error:', res);
					if (res.statusCode === 401) {
						uni.removeStorageSync('token');
						uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
						setTimeout(() => {
							uni.reLaunch({ url: '/pages/login/login' });
						}, 1500);
					} else {
						uni.showToast({
							title: res.data.message || `请求失败(${res.statusCode})`,
							icon: 'none'
						});
					}
					reject(res.data);
				}
			},
			fail: (err) => {
				console.error('Network Error:', err);
				uni.showToast({
					title: '网络连接失败，请检查服务是否启动',
					icon: 'none'
				});
				reject(err);
			}
		});
	});
};

export default request;
