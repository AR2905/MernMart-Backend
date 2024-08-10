const express = require('express');
const { fetchCategories, createCategory } = require('../controller/Category_Ctrl');

const router = express.Router();
//  /categories is already added in base path
router.get('/', fetchCategories).post('/',createCategory)

exports.router = router;