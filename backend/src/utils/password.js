// utils/password.js
// 密码哈希 / 校验。
// bcrypt cost = 10(与现有 seeders/001-demo-data.js 保持一致)

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

exports.hash = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

exports.compare = async (plain, hashed) => bcrypt.compare(plain, hashed);
