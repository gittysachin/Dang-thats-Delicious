const nodemailer = require('nodemailer'); // nodemailer with interface with SMTP or any number of transports and it will do the sending of email for you 
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');
const {promisify} = require('es6-promisify');

const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// transport.sendMail({
//     from: `Sachin Jangid <noreply@sachinjangid.com>`,
//     to: 'random@example.com',
//     subject: 'Just trying things out',
//     html: 'Hey I <strong>love</strong> you',
//     text: 'Hey I **love** you'
// });

const generateHTML = (filename, options = {}) => {
    const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
    const inlined = juice(html); // it will inline all of our css so that we can see the the HTML and CSS very nicely
    return inlined;
}

exports.send = async (options) => {
    const html = generateHTML(options.filename, options);
    const text = htmlToText.fromString(html);
    const mailOptions = {
        from: `Sachin Jangid <noreply@sachinjangid.com>`,
        to: options.user.email,
        subject: options.subject,
        html,
        text
    };

    const sendMail = promisify(transport.sendMail.bind(transport));
    return sendMail(mailOptions);
}