require("dotenv").config();
const { validationResult, Result } = require("express-validator");
const axios = require("axios");
const nodeMailer = require("nodemailer");

const transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER_ID,
    pass: process.env.PASSWORD,
  },
});

let total = 28896;

exports.getChatIndex = (req, res, next) => {
  console.log(req.user.apikeyindex, req.user.maxApiKey);
  if (req.session.answer) {
    return res.render("public/chat", {
      answer: req.session.answer,
      isIndex: false,
    });
  }

  res.render("public/chat", {
    answer: [
      {
        question: "",
        answer: ``,
      },
    ],
    isIndex: true,
  });
};

exports.getImageIndex = (req, res, next) => {
  res.render("public/image", {
    modeon: false,
    preInput: "",
    imgaeLink: "/images/dalhe.jpg",
  });
};

exports.postChat = (req, res, next) => {
  const que = req.body.value;
  const error = validationResult(req);
  if (!error.isEmpty() || que.length < 2) {
    return res.status(422).render("public/chat", {
      answer: [
        {
          question: que,
          answer: "Please enter a valid input",
        },
      ],
      isIndex: false,
    });
  }
  if (req.user.apikeyindex.toString() >= req.user.maxApiKey.toString()) {
    return res.render("public/chat", {
      answer: [
        {
          question: "What's wrong Chat Sonic?",
          answer:
            "We faced some major issues. We try to fixed it as soon as possible. Please try again later",
        },
      ],
      isIndex: false,
    });
  }

  if (!req.session.answer) {
    req.session.message = [];
    req.session.answer = [];
  }
  req.session.message.push({ role: "user", content: que });

  async function apiCall(indexApi) {
    const messageLimit = req.session.message.slice(-5);
    let api;
    if (indexApi >= 0) {
      api = process.env.API_KEY.split(",")[indexApi];
    }
    const options = {
      method: "POST",
      url: "https://openai80.p.rapidapi.com/chat/completions",
      headers: {
        "Accept-Encoding": "gzip,deflate,compress",
        "content-type": "application/json",
        "X-RapidAPI-Key": api,
        "X-RapidAPI-Host": "openai80.p.rapidapi.com",
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: messageLimit,
      },
    };

    axios
      .request(options)
      .then((response) => {
        const reply = response.data.choices[0].message.content;
        total += Number(response.data.usage.total_tokens);
        if (reply.includes("```")) {
          req.session.answer.push({
            question: que,
            answer: reply,
            isCode: true,
          });
        } else {
          req.session.answer.push({
            question: que,
            answer: reply,
            isCode: false,
          });
        }

        res.render("public/chat", {
          answer: req.session.answer,
          isIndex: false,
        });
      })
      .catch((error) => {
        let errorData = error.response.data.message;

        if (
          errorData.includes(
            "You have exceeded the MONTHLY quota for Tokens on your current plan"
          )
        ) {
          res.render("public/chat", {
            answer: [
              {
                question: "What's wrong Chat Sonic?",
                answer:
                  "Sorry we faced some api issue please wait for a moment .It will be fixed automatically.Please try again",
              },
            ],
            isIndex: false,
          });
          let userApiIndex = req.user.apikeyindex + 1;
          req.user.apikeyindex = userApiIndex;

          req.user
            .save()
            .then((result) => {
              const remaningApi = req.user.maxApiKey - req.user.apikeyindex;
              const mailOption = {
                from: process.env.USER_ID,
                to: process.env.TO_USER_ID,
                subject: "API ISSUE",
                html: `<html><body style="width : 95%; text-align:center;   display: flex;
                justify-content: center;
                align-items: center; margin : auto ; background-color :#000000d9;padding : 15px ;">
                
                <div style="width : 95% ;height : 90%; text-align : center; margin : 12px auto ; background-color : #0c0921; padding:1rem">
                <h1 style="color : green">Hi Your Api limit is end. We call a new api . please add more api</h1>
                  <h2 style="margin:12px , color : orange "> Remaing API - ${remaningApi} </h2>
                </div>
                
                </body></html>`,
              };
              return transporter.sendMail(mailOption);
            })
            .then((response) => {
              console.log(response);
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          console.log(error);
          res.render("public/chat", {
            answer: [
              {
                question: "What's wrong Chat Sonic?",
                answer: "Something went wrong. Please try again later",
              },
            ],
            isIndex: false,
          });
        }
      });
  }

  apiCall(req.user.apikeyindex);
};

exports.postImage = (req, res, next) => {
  const value = req.body.value;
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(422).render("public/image", {
      modeon: false,
      preInput: value,
      imgaeLink: "/images/invalid.jpg",
    });
  }
  if (req.user.apikeyindex.toString() >= req.user.maxApiKey.toString()) {
    return res.render("public/chat", {
      answer: [
        {
          question: "What's wrong Chat Sonic?",
          answer:
            "We faced some major issues. We try to fixed it as soon as possible. Please try again later",
        },
      ],
      isIndex: false,
    });
  }
  async function apiCall(indexApi) {
    let api;
    if (indexApi >= 0) {
      api = process.env.API_KEY.split(",")[indexApi];
      console.log(api);
    }
    const options = {
      method: "POST",
      url: "https://openai80.p.rapidapi.com/images/generations",
      headers: {
        "Accept-Encoding": "gzip,deflate,compress",
        "content-type": "application/json",
        "X-RapidAPI-Key": api,
        "X-RapidAPI-Host": "openai80.p.rapidapi.com",
      },
      data: {
        prompt: value,
        n: 1,
        size: "1024x1024",
      },
    };

    axios
      .request(options)
      .then((response) => {
        const imageLink = response.data.data[0].url;
        console.log(response.data.data);

        res.render("public/image", {
          modeon: true,
          preInput: value,
          imgaeLink: imageLink,
        });
      })
      .catch((error) => {
        let errorData = error.response.data.message;

        if (
          errorData.includes(
            "You have exceeded the MONTHLY quota for Tokens on your current plan"
          )
        ) {
          res.render("public/chat", {
            answer: [
              {
                question: "What's wrong Chat Sonic?",
                answer:
                  "Sorry we faced some api issue please wait for a moment. It will be fixed automatically. Please try again",
              },
            ],
            isIndex: false,
          });

          let userApiIndex = req.user.apikeyindex + 1;
          req.user.apikeyindex = userApiIndex;
          if (userApiIndex == user.maxApiKey) {
            return res.render("public/chat", {
              answer: [
                {
                  question: "What's wrong Chat Sonic?",
                  answer:
                    "Sorry we faced some major issue. We try to solve it as soon as possible. Please try again later",
                },
              ],
              isIndex: false,
            });
          }
          req.user
            .save()
            .then((result) => {
              const remaningApi = req.user.maxApiKey - req.user.apikeyindex;

              const mailOption = {
                from: process.env.USER_ID,
                to: process.env.TO_USER_ID,
                subject: "API ISSUE",
                html: `<html><body style="width : 95%; text-align:center;   display: flex;
    justify-content: center;
    align-items: center; margin : auto ; background-color :#000000d9;padding : 15px ;">
                
                <div style="width : 95% ;height : 90%; text-align : center; margin : 12px auto ; background-color : #0c0921; padding:1rem">
                <h1 style="color : green">Hi Your Api limit is end. We call a new api . please add more api</h1>
                 <h2 style="margin:12px , color : orange ">
                Remaing API - ${remaningApi}}
              </h2>;
                </div>
                
                </body></html>`,
              };
              return transporter.sendMail(mailOption);
            })
            .then((response) => {
              console.log(response);
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          console.log(error);
          res.render("public/image", {
            modeon: false,
            preInput: value,
            imgaeLink: "/images/invalid2.jpg",
          });
        }
      });
  }

  apiCall(req.user.apikeyindex);
};
