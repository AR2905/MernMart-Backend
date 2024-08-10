const express = require('express');
const { fetchCategories, createCategory } = require('../controller/Category_Ctrl');

const router = express.Router();

// Log to check if the controller is being imported correctly
console.log('Category Controller:', fetchCategories, createCategory);

// Define routes for fetching and creating categories
router.get('/', fetchCategories);
router.post('/', createCategory);

module.exports = router; // Corrected the export to avoid destructuring during import
