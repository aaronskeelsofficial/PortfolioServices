//Init Vars
const RESPONSE_CODE = {
    CREATEACCT_USERNAME_LENGTH: '1:That username\'s length is not valid.',
    CREATEACCT_USERNAME_CHARS: '2:That username uses invalid characters.',
    CREATEACCT_PASSWORD_LENGTH: '3:That password\'s length is not valid.',
    CREATEACCT_SALT_BAD: '4:The salt provided is invalid.',
    CREATEACCT_USER_EXIST: '5:The username provided already exists.',
    CREATEACCT_EMAIL_LENGTH: '6:That email\'s length is not valid.',
    CREATEACCT_DISPLAYNAME_LENGTH: '7:That displayname\'s length is not valid.',
    CREATEACCT_DISPLAYNAME_CHARS: '8:That displayname uses invalid characters.',
    CREATEACCT_SUCCESS: '9:Account creation was successful!',
    LOGIN_USER_NOEXIST: '10:That username does not exist.',
    LOGIN_PASS_WRONG: '11:That password is incorrect.',
    LOGIN_SUCCESS: '12:Login was successful!' //:uuid:session
};
let sqldb;

//Utility functions
function isAlphaNumeric(str) {
    let code, i, len;
    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123) && // lower alpha (a-z)
            !(code == 45) && // hyphen(-)
            !(code == 95)) { // underline(_)
            return false;
        }
    }
    return true;
};
function generatePasswordSalt(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

module.exports.init = function (sqlite3) {
  console.log(global.__basedir);
    sqldb = new sqlite3.Database(global.__basedir + "/sqlaccounts/accountdata.data", (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Connected to the flatfile SQlite database successfully.');
    });
    sqldb.run(`CREATE TABLE \`accounts\` (
          \`UUID\` varchar(36) NOT NULL,
          \`Username\` varchar(16) NOT NULL,
          \`PasswordHash\` varchar(44) NOT NULL,
          \`Email\` varchar(40) DEFAULT NULL,
          \`Displayname\` varchar(16) DEFAULT NULL,
          \`Salt\` varchar(45) DEFAULT NULL,
          \`Session\` varchar(36) DEFAULT NULL,
          PRIMARY KEY (\`UUID\`)
        );`, function (err, result) {
            if (err) {
                if (err.errno == 1) {
                    console.log("Connected to SQL table successfully.");
                } else
                    throw err;
            } else {
                console.log("Table accounts doesn't exist. Creating...");
            }
        }
    );
}

module.exports.handleCreateAccount = function (req, res, uuidv4, crypto) {
    console.log("User Attempting Connection: /projects/SQLAccounts/createacct");
    mail = req.body.e;
    disp = req.body.d;
    user = req.body.u.toLowerCase();
    pass = req.body.p;
    salt = req.body.s;
    //Check if email was input and valid
    if(mail == null || mail.length < 1 || mail.length > 40 || mail.indexOf("@") == -1) {
        res.send(RESPONSE_CODE.CREATEACCT_EMAIL_LENGTH);
        return;
    }
    //Check if displayname was input and valid
    if(disp == null || disp.length < 1 || disp.length > 16) {
        res.send(RESPONSE_CODE.CREATEACCT_DISPLAYNAME_LENGTH);
        return;
    }
    if(!isAlphaNumeric(disp)){
        res.send(RESPONSE_CODE.CREATEACCT_DISPLAYNAME_CHARS);
        return;
    }
    //Check if username was input and valid
    if(user == null || user.length < 1 || user.length > 16) {
        res.send(RESPONSE_CODE.CREATEACCT_USERNAME_LENGTH);
        return;
    }
    if(!isAlphaNumeric(user)){
        res.send(RESPONSE_CODE.CREATEACCT_USERNAME_CHARS);
        return;
    }
    //Check if password was input and valid
    if(pass == null || pass.length < 1 || pass.length > 45){
        res.send(RESPONSE_CODE.CREATEACCT_PASSWORD_LENGTH);
        return;
    }
    //Check if salt is valid
    if(salt == null || salt.length < 1 || salt.length > 5 || !isAlphaNumeric(salt)){
        res.send(RESPONSE_CODE.CREATEACCT_SALT_BAD);
        return;
    }
    //Check if username exists
    stmt = sqldb.prepare(`
        SELECT Username
        FROM accounts
        WHERE Username = ?;
    `);
    stmt.get([user], function (err, result) {
        if (err){
            throw err;
        }
        if(result != undefined){
            res.send(RESPONSE_CODE.CREATEACCT_USER_EXIST);
            return;
        }
        //Create account
        let hashedPass = crypto.createHash("sha256").update(pass+salt).digest("base64");
        let genUUID = uuidv4();
        stmt = sqldb.prepare(`
            INSERT INTO accounts (UUID, Username, PasswordHash, Email, Displayname, Salt)
            VALUES (?,?,?,?,?,?);
        `);
        stmt.run([genUUID, user, hashedPass, mail, disp, salt], function (err, result) {
            if (err) throw err;
            console.log("Created account for " + genUUID + "\t\t" + user);
            res.cookie("sqlaccounts-salt", salt, {maxAge: 1000*60*60});
            res.send(RESPONSE_CODE.CREATEACCT_SUCCESS);
        });
    });
};

module.exports.handleLoginAccount = function (req, res, uuidv4, crypto) {
    console.log("User Attempting Connection: /projects/SQLAccounts/loginacct");
    user = req.body.u.toLowerCase();
    pass = req.body.p;
    //Check if username was input and valid
    if(user == null || user.length < 1 || user.length > 16) {
        res.send(RESPONSE_CODE.CREATEACCT_USERNAME_LENGTH);
        return;
    }
    if(!isAlphaNumeric(user)){
        res.send(RESPONSE_CODE.CREATEACCT_USERNAME_CHARS);
        return;
    }
    //Check if password was input and valid
    if(pass == null || pass.length < 1 || pass.length > 45){
        res.send(RESPONSE_CODE.CREATEACCT_PASSWORD_LENGTH);
        return;
    }
    //Check if username exists
    stmt = sqldb.prepare(`
        SELECT Username, Salt
        FROM accounts
        WHERE Username = ?;
    `);
    stmt.get([user], function (err, result) {
        if (err){
            throw err;
        }
        if(result == undefined){
            res.send(RESPONSE_CODE.LOGIN_USER_NOEXIST);
            return;
        }
        stmt = sqldb.prepare(`
            SELECT Username, Salt
            FROM accounts
            WHERE Username = ?;
        `);
        stmt.get([user], function (err, result) {
            if (err){
                throw err;
            }
            if(result == undefined){
                res.send(RESPONSE_CODE.LOGIN_USER_NOEXIST);
                return;
            }
            let salt = result.Salt;
            let hashedPass = crypto.createHash("sha256").update(pass+salt).digest("base64");
            //Check if password is correct
            stmt = sqldb.prepare(`
                SELECT UUID
                FROM accounts
                WHERE Username = ?
                AND PasswordHash = ?;
            `);
            stmt.get([user, hashedPass], function (err, result) {
                if (err){
                    throw err;
                }
                if(result == undefined) {
                    res.send(RESPONSE_CODE.LOGIN_PASS_WRONG);
                    return;
                }
                let uuid = result.UUID;
                let genUUID = uuidv4();
                stmt = sqldb.prepare(`
                    UPDATE accounts
                    SET Session = ?
                    WHERE UUID = ?;
                `);
                stmt.run([genUUID, uuid], function (err) {
                    if (err){
                        throw err;
                    }
                    res.cookie("sqlaccounts-session", genUUID, {maxAge: 1000*60*60});
                    res.send(RESPONSE_CODE.LOGIN_SUCCESS);
                });
            });
        });
    });
    /*
    con.query(`CALL getUsernameAndSalt('`+user+`');`, function (err, result) {
        if (err) throw err;
        if(result[0].length == 0){
            res.send(RESPONSE_CODE.LOGIN_USER_NOEXIST);
            return;
        }
        let salt = result[0][0].Salt;
        let hashedPass = crypto.createHash("sha256").update(pass+salt).digest("base64");
        //Check if password is correct
        con.query(`CALL validateLogin('`+user+`','`+hashedPass+`');`, function (err, result) {
            if (err) throw err;
            if(result[0].length == 0){
                res.send(RESPONSE_CODE.LOGIN_PASS_WRONG);
                return;
            }
            let uuid = result[0][0].UUID;
            //Link with session UUID
            let genUUID = uuidv4();
            con.query(`UPDATE accounts
                SET Session = '`+genUUID+`'
                WHERE UUID = '`+uuid+`';`, function (err, result) {
                if (err) throw err;
                console.log("Began session for " + uuid + "\t\t" + user);
                res.send(RESPONSE_CODE.LOGIN_SUCCESS);
            });
            //TODO: Schedule session to be destroyed on both client and server
        });
    });
     */
};

module.exports.handleCountAccounts = function (req, res) {
    stmt = sqldb.prepare(`
            SELECT COUNT(*) FROM accounts;
        `);
    stmt.get([], function (err, result) {
        if (err) throw err;
        res.send(result);
    });
};