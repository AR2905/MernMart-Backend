const User  = require('../model/User_Model');
const crypto = require('crypto');
const { sanitizeUser } = require('../Services/common');
const jwt = require('jsonwebtoken');
const { log } = require('console');

exports.createUser = async (req, res) => {
  try {
    // Log to check if the token is being set
    console.log('Setting cookie');
    res
      .cookie('jwt', token, {
        expires: new Date(Date.now() + 3600000),
        httpOnly: true,
        sameSite: 'None',
        secure: process.env.NODE_ENV === 'production', // Ensure cookies are sent over HTTPS in production
      })
      .status(201)
      .json({ id: doc.id, role: doc.role });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(400).json(err);
  }
};

exports.loginUser = async (req, res) => {
  const user = req.user
  
  res
    .cookie('jwt', user.token, {
      expires: new Date(Date.now() + 3600000),
      httpOnly: true,
    })
    .status(201)
    .json({id:user.id, role : user.role});
};

exports.logout = async (req, res) => {
  res
    .cookie('jwt', null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .sendStatus(200)
};

exports.checkAuth = async (req, res) => {
  if(req.user){
    res.json(req.user);
  } else{
    res.sendStatus(401);
  }
};