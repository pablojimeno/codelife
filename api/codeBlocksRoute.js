const {isAuthenticated, isRole} = require("../tools/api.js");
const Op = require("sequelize").Op;
const FLAG_COUNT_HIDE = process.env.FLAG_COUNT_HIDE;
const FLAG_COUNT_BAN = process.env.FLAG_COUNT_BAN;

function flattenCodeBlock(user, cb) {
  cb.username = cb.user ? cb.user.username : "";
  cb.sharing = cb.userprofile ? cb.userprofile.sharing : "false";
  cb.likes = cb.likelist.length;
  cb.reports = cb.reportlist.filter(r => r.status === "new" && r.type === "codeblock").length;
  cb.hidden = cb.reports >= FLAG_COUNT_HIDE || cb.status === "banned" || cb.sharing === "false";
  if (cb.reports >= FLAG_COUNT_BAN || cb.status === "banned" || cb.sharing === "false") cb.studentcontent = "This content has been disabled";
  if (user) {
    cb.reported = Boolean(cb.reportlist.find(r => r.uid === user.id));
    cb.liked = Boolean(cb.likelist.find(l => l.uid === user.id));
  }
  return cb;
}

const cbIncludes = [
  {association: "userprofile", attributes: ["sharing"]}, 
  {association: "user", attributes: ["username"]}, 
  {association: "likelist"}, 
  {association: "reportlist"}
];

module.exports = function(app) {

  const {db} = app.settings;

  // Used by Island.jsx to get this user's codeblocks
  app.get("/api/codeBlocks/mine", isAuthenticated, (req, res) => {
    db.codeblocks.findAll({where: {uid: req.user.id}}).then(u => res.json(u).end());
  });

  // Used by Codeblock.jsx to save new Codeblocks
  app.post("/api/codeBlocks/new", isAuthenticated, (req, res) => {
    db.codeblocks.create({studentcontent: req.body.studentcontent, snippetname: req.body.name, uid: req.body.uid, lid: req.body.iid})
      .then(u => res.json(u).end());
  });

  // Used by CodeBlock.jsx to update the CodeBlock Test
  app.post("/api/codeBlocks/update", isAuthenticated, (req, res) => {
    db.codeblocks.update({studentcontent: req.body.studentcontent, snippetname: req.body.name}, {where: {uid: req.body.uid, lid: req.body.iid}})
      .then(u => res.json(u).end());
  });

  // Used by ReportBox and ReportViewer to ban codeblocks, Admin Only
  app.post("/api/codeBlocks/setstatus", isRole(2), (req, res) => {
    const {status, id} = req.body;
    db.codeblocks.update({status}, {where: {id}}).then(u => {
      db.reports.update({status}, {where: {type: "codeblock", report_id: id}}).then(() => res.json(u).end());
    });
  });

  // Used by Home.jsx to get hand-picked featured blocks
  app.get("/api/codeBlocks/featured", (req, res)  => {
    db.codeblocks.findAll({
      where: {
        [Op.or]: [{id: 863}, {id: 834}, {id: 921}, {id: 30}]
      },
      include: cbIncludes
    })
      .then(cbRows => 
        res.json(cbRows
          .map(cb => flattenCodeBlock(req.user, cb.toJSON()))).end()
      );
  });

  // Used by UserCodeBlocks.jsx to get codeblock list for profile page
  app.get("/api/codeBlocks/byuser", isAuthenticated, (req, res) => {
    db.codeblocks.findAll({
      include: cbIncludes.map(i => i.association === "user" ? Object.assign({}, i, {where: {id: req.query.uid}}) : i)
    })
      .then(cbRows => 
        res.json(cbRows
          .map(cb => flattenCodeBlock(req.user, cb.toJSON()))
          .filter(cb => !cb.hidden)
          .sort((a, b) => a.id - b.id))
          .end()
      );
  });

  // Used by Share.jsx to publicly share code
  app.get("/api/codeBlocks/byUsernameAndFilename", (req, res) => {
    db.codeblocks.findAll({
      where: {
        snippetname: req.query.filename
      },
      include: cbIncludes.map(i => i.association === "user" ? Object.assign({}, i, {where: {username: req.query.username}}) : i)
    })
      .then(cbRows => 
        res.json(cbRows
          .map(cb => flattenCodeBlock(req.user, cb.toJSON())))
          .end()
      );
  });

  // Used by CodeBlockList.jsx and Level.jsx to get codeblocks 
  app.get("/api/codeBlocks/all", isAuthenticated, (req, res) => {
    db.codeblocks.findAll({
      where: req.query,
      include: cbIncludes
    })
      .then(cbRows => 
        res.json(cbRows
          .map(cb => flattenCodeBlock(req.user, cb.toJSON()))
          .filter(cb => !cb.hidden)
          .sort((a, b) => b.likes - a.likes || b.id - a.id))
          .end()
      );
  });

};