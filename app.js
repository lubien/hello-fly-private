var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

if (process.env.CRASH_ME === "1") {
  setTimeout(() => {
    process.exit(1); 
  }, 3000); // 3000 milliseconds = 3 seconds
}


class MemoryConsumer {
  constructor() {
    this.memoryHog = [];
    this.isRunning = false;
    this.intervalId = null;
    this.stats = {
      iterations: 0,
      startTime: Date.now(),
      allocatedMB: 0
    };
  }

  // Allocate memory in chunks
  allocateMemory(sizeInMB = 10) {
    const bytes = sizeInMB * 1024 * 1024;
    const buffer = new Array(bytes / 8).fill('X'.repeat(8));
    this.memoryHog.push(buffer);
    this.stats.allocatedMB += sizeInMB;
  }

  // Get current memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  }

  // Print stats
  logStats() {
    const mem = this.getMemoryUsage();
    const runtime = Math.round((Date.now() - this.stats.startTime) / 1000);
    
    console.log('\n--- Memory Stats ---');
    console.log(`Runtime: ${runtime}s | Iterations: ${this.stats.iterations}`);
    console.log(`RSS: ${mem.rss}MB | Heap Used: ${mem.heapUsed}MB`);
    console.log(`Heap Total: ${mem.heapTotal}MB | External: ${mem.external}MB`);
    console.log(`Allocated: ~${this.stats.allocatedMB}MB`);
    console.log('-------------------\n');
  }

  // Start consuming memory
  start(chunkSizeMB = 10, intervalMs = 500) {
    if (this.isRunning) {
      console.log('Already running!');
      return;
    }

    console.log(`Starting memory consumption test...`);
    console.log(`Chunk size: ${chunkSizeMB}MB | Interval: ${intervalMs}ms\n`);
    
    this.isRunning = true;
    this.stats.startTime = Date.now();

    this.intervalId = setInterval(() => {
      try {
        this.allocateMemory(chunkSizeMB);
        this.stats.iterations++;
        this.logStats();
      } catch (error) {
        console.error('Memory allocation failed:', error.message);
        this.stop();
      }
    }, intervalMs);
  }

  // Stop consuming memory
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('\nMemory consumption stopped.');
    this.logStats();
  }

  // Clear allocated memory
  clear() {
    this.memoryHog = [];
    this.stats.allocatedMB = 0;
    if (global.gc) {
      global.gc();
      console.log('Garbage collection triggered (if --expose-gc flag is set)');
    }
  }
}

if (process.env.OOM) {
  const memoryMb = +process.env.OOM;
  
  const consumer = new MemoryConsumer();
  consumer.start(memoryMb, 500);
}

module.exports = app;
