const express = require('express');
const { fetchUserById, updateUser } = require('../controller/User_Ctrl');

const router = express.Router();
//  /users is already added in base path
router.get('/own', fetchUserById)
      .patch('/:id', updateUser)

      module.exports = router;
