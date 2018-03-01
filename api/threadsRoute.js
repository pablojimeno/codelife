const {isAuthenticated, isRole} = require("../tools/api.js");
const sequelize = require("sequelize");
// const translate = require("../tools/translate.js");
const FLAG_COUNT_HIDE = process.env.FLAG_COUNT_HIDE;
const FLAG_COUNT_BAN = process.env.FLAG_COUNT_BAN;

const threadInclude = [
  { 
    association: "commentlist", 
    include: [
      {
        association: "user", 
        attributes: ["name", "username", "id", "role"]
      },
      {
        association: "reportlist"
      },
      {
        association: "likelist"
      },
      {
        association: "userprofile", 
        attributes: ["img"]
      }
    ]
  },
  {
    association: "user", 
    attributes: ["name", "username", "id", "role"]
  },
  {
    association: "likelist"
  },
  {
    association: "reportlist"
  },
  {
    association: "userprofile", 
    attributes: ["img"]
  }
];



function pruneThread(user, t) {
  t = t.toJSON();
  t.reportlist = t.reportlist.filter(r => r.status === "new" && r.type === "thread");
  t.reports = t.reportlist.length;
  t.likelist = t.likelist.filter(l => l.type === "thread");
  t.likes = t.likelist.length;
  if (t.reports >= FLAG_COUNT_HIDE) {
    t.title = "[Under Admin Review]";
    t.content = "This thread is being reviewed by a site adminstrator and may be removed.";
  }
  t.banned = t.reports >= FLAG_COUNT_BAN || t.status === "banned" || t.userprofile.sharing === "false";
  if (!t.banned && t.commentlist) {
    t.commentlist = t.commentlist.map(c => {
      c.reportlist = c.reportlist.filter(r => r.status === "new" && r.type === "comment");
      c.reports = c.reportlist.length;
      c.likelist = c.likelist.filter(l => l.type === "comment");
      c.likes = c.likelist.length;
      if (c.reports >= FLAG_COUNT_HIDE) {
        c.title = "[Under Admin Review]";
        c.content = "This thread is being reviewed by a site adminstrator and may be removed.";
      }
      c.banned = c.reports >= FLAG_COUNT_BAN || c.status === "banned" || c.userprofile.sharing === "false";
      if (user) {
        c.report = c.reportlist.find(r => r.uid === user.id);
        c.liked = Boolean(c.likelist.find(l => l.uid === user.id));
      }
      delete c.reportlist;
      delete c.likelist;
      delete c.reports;
      return c;
    });
    t.commentlist = t.commentlist.filter(c => !c.banned);
  }
  if (user) {
    t.report = t.reportlist.find(r => r.uid === user.id);
    t.liked = Boolean(t.likelist.find(l => l.uid === user.id));
  }
  delete t.reportlist;
  delete t.likelist;
  delete t.reports;
  return t;
}

module.exports = function(app) {

  const {db} = app.settings;

  // Used in Discussion to retrieve threads for a given entity id
  app.get("/api/threads/all", (req, res) => {
    db.threads.findAll({
      where: req.query,
      include: threadInclude
    }).then(threads => {
      threads = threads
        .map(t => pruneThread(req.user, t))
        .filter(t => !t.banned)
        .sort((a, b) => b.date < a.date ? 1 : -1);
      res.json(threads).end();
    });
  });

  // Used by ReportBox and ReportViewer to ban threads, Admin Only
  app.post("/api/threads/setstatus", isRole(2), (req, res) => {
    const {status, id} = req.body;
    db.threads.update({status}, {where: {id}}).then(u => {
      db.reports.update({status}, {where: {type: "thread", report_id: id}}).then(() => res.json(u).end());
    });
  });

  // Used by ReportBox and ReportViewer to ban comments, Admin Only
  app.post("/api/comments/setstatus", isRole(2), (req, res) => {
    const {status, id} = req.body;
    db.comments.update({status}, {where: {id}}).then(u => {
      db.reports.update({status}, {where: {type: "comment", report_id: id}}).then(() => res.json(u).end());
    });
  });

  // Used in Discussion to start a new thread
  app.post("/api/threads/new", isAuthenticated, (req, res) => {
    db.threads.create({
      title: req.body.title, 
      content: req.body.content, 
      date: db.fn("NOW"),
      subject_type: req.body.subject_type,
      subject_id: req.body.subject_id,
      uid: req.user.id
    }).then(newThread => {
      db.threads.findAll({
        where: {
          subject_type: req.body.subject_type,
          subject_id: req.body.subject_id
        },
        include: threadInclude
      }).then(threads => {
        threads = threads
          .map(t => pruneThread(req.user, t))
          .filter(t => !t.banned)
          .sort((a, b) => b.date < a.date ? 1 : -1);
        res.json({newThread, threads}).end();
      });
    });
  });

  app.post("/api/comments/new", isAuthenticated, (req, res) => {
    db.comments.create({
      title: req.body.title,
      content: req.body.content,
      date: db.fn("NOW"),
      thread_id: req.body.thread_id,
      uid: req.user.id
    }).then(newComment => { 
      db.threads.findOne({
        where: {
          id: req.body.thread_id
        },
        include: threadInclude
      }).then(thread => {
        thread = pruneThread(req.user, thread);
        res.json(thread).end();
      });

    });
  });

};