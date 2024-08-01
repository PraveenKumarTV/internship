const express = require('express');
const multer = require('multer');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3030;

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads')); // Save uploaded files to 'uploads/' directory
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// MongoDB connection URI with authentication (if applicable)
const uri = 'mongodb://praveen:praveen123@localhost:27017'; // Replace with your MongoDB URI

// Connect to MongoDB
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect((err) => {
    if (err) {
        console.error('Error connecting to MongoDB:', err);
        return;
    }
    console.log('Connected to MongoDB');
});

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handle form submission
app.post('/submit', upload.single('profilePhoto'), (req, res) => {
    const doctorData = req.body;
    doctorData.profilePhoto = req.file ? '/uploads/' + req.file.filename : ''; // Save file path or URL to profile photo

    // Ensure timings is an array
    doctorData.timings = req.body.timings ? req.body.timings : [];

    // Insert doctor data into MongoDB
    const db = client.db('doctorDB'); // Specify database
    const collection = db.collection('doctors'); // Specify collection

    collection.insertOne(doctorData)
        .then(result => {
            console.log('Inserted document:', result.ops[0]);
            res.send('Doctor information saved successfully.');
        })
        .catch(err => {
            console.error('Error inserting document:', err);
            res.status(500).send('Error saving doctor information.');
        });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
