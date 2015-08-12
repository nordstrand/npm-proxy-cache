var path = require('path'),
  fs = require('fs'),
  crypto = require('crypto'),
  mkdirp = require('mkdirp');
var MemoryStream = require('memorystream');

function Cache(opts) {

  this.opts = opts || {}
  this.opts.ttl = (opts.ttl || 1800) * 1000;
  this.opts.friendlyNames = opts.friendlyNames;

    
  this.cache = new Map();


  this.stat = function(fullpath) {
    if (!fs.existsSync(fullpath))
      return {status: Cache.NOT_FOUND};

    var stat = fs.lstatSync(fullpath);
    stat.type = path.extname(fullpath) ? 'application/octet-stream' : 'application/json';
    stat.status = (Date.now() < stat.ctime.valueOf() + this.opts.ttl)
      ? Cache.FRESH
      : Cache.EXPIRED;

    return stat;
  };


  this.status = function(key) {
      var buf = this.cache.get(key);
      if (buf) {
        return {status: Cache.FRESH, size: buf.length, type: 'application/octet-stream'};
      } else  {
        return (null, {status:  Cache.NOT_FOUND});
      }
  };


  this.read = function(key) {
    var path = this.getPath(key);
     return new MemoryStream(this.cache.get(key));
  };


  this.write = function(key) {
    var locks = this.locks,
      path = this.getPath(key);

      var stream = MemoryStream(null, {readable: false});
      
      stream.on('finish', (function() {
         console.log("flushing, cache size: ", this.cache.size);
         this.cache.set(key, stream.toBuffer());
      }).bind(this));
      
      return stream;
  };


  this.getPath = function(key) {
    var file, base, chunks, dir;
    if (this.opts.friendlyNames) {
      // The key is the URL; the last part is the module name and if
      // the last version is requested, it lacks the file extension
      file = path.basename(key);
      // Cut the version suffix and file extension; only module name
      // should make the directory, make sure that there is no dot as
      // directory name coming from the first characters of the fike name
      base = file.replace(/(-\d\.\d.\d)?\.tgz/, '').replace(/\./g, '-');
    } else {
      file = crypto.createHash('md5').update(key).digest('hex')
                 .substring(0, 8) + path.extname(key);
      base = file;
    }
    // Make sure that there are always 3 nested directories to avoid
    // both file and folder at the same level (/q/q, /q/q/qq)
    chunks = base.split('').splice(0, 3);
    while (chunks.length < 3)
      chunks.push('-');
    dir = chunks.join('/');

    return {
      dir: path.join(this.opts.path, dir),
      full: path.join(this.opts.path, dir, file),
      file: file,
      rel: path.join(dir, file)
    };
  };

};

Cache.NOT_FOUND = 0;
Cache.EXPIRED   = 2;
Cache.FRESH     = 4;

module.exports = Cache;
