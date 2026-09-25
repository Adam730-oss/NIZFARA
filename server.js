const express=require('express');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const { Resend } = require('resend');

const app=express();
const PORT=process.env.PORT||3000;
const ADMIN_EMAIL=process.env.ADMIN_EMAIL||'shihabadamamar34@gmail.com';
const SMTP_USER=process.env.SMTP_USER||'nizfara.co@gmail.com';
const ADMIN_SECRET=process.env.ADMIN_SECRET||'CHANGE_ME';
const DB=path.join(__dirname,'data','orders.json');
if(!fs.existsSync(path.dirname(DB))) fs.mkdirSync(path.dirname(DB),{recursive:true});
if(!fs.existsSync(DB)) fs.writeFileSync(DB,'[]');
function readOrders(){return JSON.parse(fs.readFileSync(DB,'utf8'));}
function writeOrders(x){fs.writeFileSync(DB,JSON.stringify(x,null,2));}
function id(){return 'NIZ-'+crypto.randomBytes(4).toString('hex').toUpperCase();}
function token(){return crypto.randomBytes(24).toString('hex');}
function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
const products={
 wealth:{name:'Wealth Foundations',price:99,files:['wealth-foundations.pdf']},
 digital:{name:'Digital Product Starter',price:149,files:['digital-product-starter.pdf']},
 bundle:{name:'NIZFARA Starter Bundle',price:199,files:['wealth-foundations.pdf','digital-product-starter.pdf']}
};
function mailer(){
 if(!process.env.RESEND_API_KEY) return null;
 return new Resend(process.env.RESEND_API_KEY);
}
async function sendAdmin(order){
 const t=mailer(); if(!t) return false;
 const base=process.env.PUBLIC_BASE_URL||`http://localhost:${PORT}`;
 const yes=`${base}/admin/review/${order.adminToken}/yes`;
 const no=`${base}/admin/review/${order.adminToken}/no`;
 await t.sendMail({from:`NIZFARA <${SMTP_USER}>`,to:ADMIN_EMAIL,subject:`NIZFARA payment review — ${order.orderId}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>NIZFARA — Payment Review</h2><p>A customer says they completed payment. Please check your UPI/FamApp transaction history before approving.</p><table cellpadding="8"><tr><td><b>Order</b></td><td>${esc(order.orderId)}</td></tr><tr><td><b>Product</b></td><td>${esc(order.productName)}</td></tr><tr><td><b>Amount</b></td><td>₹${order.amount}</td></tr><tr><td><b>Customer</b></td><td>${esc(order.email)}</td></tr></table><p><a href="${yes}" style="background:#e8ca96;color:#111;padding:12px 18px;text-decoration:none">YES — PAYMENT RECEIVED</a></p><p><a href="${no}" style="background:#222;color:#fff;padding:12px 18px;text-decoration:none">NO — PAYMENT NOT RECEIVED</a></p><p style="color:#777">Never approve an order until the payment is actually visible in the receiving account.</p></div>`});
 return true;
}
async function sendCustomer(order,approved){
 const t=mailer(); if(!t) return false;
 const attachments=approved?order.files.map(f=>({filename:f,path:path.join(__dirname,'courses',f)})):[];
 const subject=approved?`NIZFARA — Payment confirmed (${order.orderId})`:`NIZFARA — Payment not confirmed (${order.orderId})`;
 const html=approved?`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Payment Confirmed</h2><p>Thank you for shopping with NIZFARA.</p><p>Your payment for <b>${esc(order.productName)}</b> has been confirmed. Your digital product is attached to this email.</p><p>We appreciate your support and hope you enjoy your purchase.</p><p style="color:#777">Order ID: ${esc(order.orderId)}</p><p>Need help? Contact <a href="mailto:nizfara.co@gmail.com">nizfara.co@gmail.com</a>.</p></div>`:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Payment Not Confirmed</h2><p>Thank you for shopping with NIZFARA.</p><p>We were unable to confirm the payment for <b>${esc(order.productName)}</b> at this time, so your order has not been completed.</p><p>If you believe you already paid, please contact <a href="mailto:nizfara.co@gmail.com">nizfara.co@gmail.com</a> with your Order ID so we can review it.</p><p><b>Please do not make another payment until the issue has been reviewed.</b></p><p style="color:#777">Order ID: ${esc(order.orderId)}</p></div>`;
 await t.sendMail({from:`NIZFARA <${SMTP_USER}>`,to:order.email,subject,html,attachments});
 return true;
}
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.post('/api/order',async(req,res)=>{
 try{
  const {productId,email}=req.body; const p=products[productId];
  if(!p||!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({error:'Please provide a valid product and email address.'});
  const order={orderId:id(),productId,email:email.trim(),productName:p.name,amount:p.price,files:p.files,status:'PENDING_PAYMENT_REVIEW',adminToken:token(),createdAt:new Date().toISOString()};
  const orders=readOrders();orders.push(order);writeOrders(orders);
  res.json({orderId:order.orderId,status:order.status,upi:'8078191161@fam',support:'nizfara.co@gmail.com'});
 }catch(e){res.status(500).json({error:'Could not create order.'});}
});
app.post('/api/order/:orderId/claim-payment',async(req,res)=>{
 const orders=readOrders(); const o=orders.find(x=>x.orderId===req.params.orderId); if(!o)return res.status(404).json({error:'Order not found.'});
 if(o.status!=='PENDING_PAYMENT_REVIEW')return res.status(400).json({error:'This order is already under a final review state.'});
 o.claimedAt=new Date().toISOString(); writeOrders(orders);
 let emailed=false; try{emailed=await sendAdmin(o);}catch(e){console.error(e);}
 res.json({ok:true,emailed,status:o.status,message:'Thank you. Your payment is under review. Once it is confirmed, your digital product will be sent to your given Gmail as soon as possible.'});
});
app.get('/api/order/:orderId',(req,res)=>{const o=readOrders().find(x=>x.orderId===req.params.orderId);if(!o)return res.status(404).json({error:'Order not found.'});res.json({orderId:o.orderId,productName:o.productName,status:o.status,email:o.email});});
app.get('/admin/review/:token/:decision',async(req,res)=>{
 if(ADMIN_SECRET==='CHANGE_ME') return res.status(503).send('Admin secret is not configured.');
 const orders=readOrders(); const o=orders.find(x=>x.adminToken===req.params.token); if(!o)return res.status(404).send('Invalid or expired review link.');
 if(!['yes','no'].includes(req.params.decision))return res.status(400).send('Invalid decision.');
 if(o.status!=='PENDING_PAYMENT_REVIEW')return res.send('<h2>NIZFARA</h2><p>This order has already been processed.</p>');
 const approved=req.params.decision==='yes'; o.status=approved?'PAID_CONFIRMED':'PAYMENT_NOT_CONFIRMED';o.reviewedAt=new Date().toISOString();writeOrders(orders);
 try{await sendCustomer(o,approved);o.customerEmailed=true;writeOrders(orders);}catch(e){console.error(e);}
 res.send(`<div style="font-family:Arial,sans-serif;max-width:600px;margin:60px auto;padding:24px"><h1>NIZFARA</h1><h2>${approved?'Payment confirmed':'Payment not confirmed'}</h2><p>Order <b>${esc(o.orderId)}</b> has been marked <b>${approved?'PAID_CONFIRMED':'PAYMENT_NOT_CONFIRMED'}</b>.</p><p>The customer notification has been queued through the configured email account.</p></div>`);
});
app.listen(PORT,'0.0.0.0',()=>console.log(`NIZFARA running on port ${PORT}`));
