require('dotenv').config()
const express = require('express');
const server = express();
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const cookieParser = require('cookie-parser');
const productsRouter = require('./Router/Product');
const categoriesRouter = require('./Router/Category'); // Correct way to require the router after fixing the export
const brandsRouter = require('./Router/Brand');
const usersRouter = require('./Router/User');
const authRouter = require('./Router/Auth');
const cartRouter = require('./Router/Cart');
const ordersRouter = require('./Router/Order');
const User = require('./model/User_Model');
const { isAuth, sanitizeUser, cookieExtractor } = require('./Services/common');
const path = require('path');
const Order = require('./model/Order_Model');


// ------------------------

// Webhook

// TODO: we will capture actual order after deploying out server live on public URL

const endpointSecret = process.env.ENDPOINT_SECRET;

server.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      const order =  await Order.findById(paymentIntentSucceeded.metadata.orderId)
      order.paymentStatus = 'received'
      await order.save()
      console.log("Payment Done : ",{paymentIntentSucceeded})
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});





// JWT options

const opts = {};
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY; // TODO: should not be in code;

//middlewares

// server.use(express.static(path.resolve(__dirname,'build')))
server.use(cookieParser());
server.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Ensure cookies are sent over HTTPS in production
      httpOnly: true, // Helps mitigate cross-site scripting (XSS) attacks
      sameSite: 'None', // Necessary if front-end and back-end are on different domains
    },
  })
);

// Ensure your server trusts the proxy, which is important for secure cookies:
if (process.env.NODE_ENV === 'production') {
  server.set('trust proxy', 1); // trust first proxy if behind a load balancer
}
server.use(passport.authenticate('session'));
server.use(
  cors({
    origin: 'https://mern-mart.vercel.app/', // Ensure this is the correct URL
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true, // Allows cookies to be sent with requests
  })
);


server.use(express.json()); // to parse req.body

server.use('/products', isAuth(), productsRouter);
// we can also use JWT token for client-only auth
server.use('/categories', isAuth(), categoriesRouter);
server.use('/brands', isAuth(), brandsRouter);
server.use('/users', isAuth(), usersRouter);
server.use('/auth', authRouter);
server.use('/cart', isAuth(), cartRouter);
server.use('/orders', isAuth(), ordersRouter)
// this line we add to make react router work in case of other routes doesnt match
// server.get('*', (req, res) =>
//   res.sendFile(path.resolve('build', 'index.html'))
// );

// Passport Strategies
passport.use(
  'local',
  new LocalStrategy(
    {usernameField:'email'},
    async function (email, password, done) {
    // by default passport uses username
    // console.log({email,password})
    try {
      const user = await User.findOne({ email: email });
      // console.log(email, password, user);
      if (!user) {
        return done(null, false, { message: 'invalid credentials' }); // for safety
      }
      crypto.pbkdf2(
        password,
        user.salt,
        310000,
        32,
        'sha256',
        async function (err, hashedPassword) {
          if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
            return done(null, false, { message: 'invalid credentials' });
          }
          const token = jwt.sign(sanitizeUser(user), process.env.JWT_SECRET_KEY);
          done(null, {id:user.id, role:user.role, token}); // this lines sends to serializer
        }
      );
    } catch (err) {
      done(err);
    }
  })
);

passport.use(
  'jwt',
  new JwtStrategy(opts, async function (jwt_payload, done) {
    console.log('JWT Payload:', jwt_payload); // Debugging line
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) {
        console.log('User found:', user); // Debugging line
        return done(null, sanitizeUser(user)); 
      } else {
        console.log('User not found'); // Debugging line
        return done(null, false);
      }
    } catch (err) {
      console.error('Error in JWT Strategy:', err); // Debugging line
      return done(err, false);
    }
  })
);

// this creates session variable req.user on being called from callbacks
passport.serializeUser(function (user, cb) {
  // console.log('serialize', user);
  process.nextTick(function () {
    return cb(null, { id: user.id, role: user.role });
  });
});

// this changes session variable req.user when called from authorized request

passport.deserializeUser(function (user, cb) {
  // console.log('de-serialize', user);
  process.nextTick(function () {
    return cb(null, user);
  });
});

// Payments


// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);


server.post("/create-payment-intent", async (req, res) => {
  const { totalAmount, orderId } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount*100, // for decimal compensation
    currency: "inr",
    automatic_payment_methods: {
      enabled: true,
    },
    metadata : {
orderId
    }

  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});



main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('database connected');
}



server.get("/", (req, res) => {
  res.send("Server is started");
});

server.listen(process.env.PORT, () => {
  console.log('Server started');
});
