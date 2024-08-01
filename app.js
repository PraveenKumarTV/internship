const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const formidable = require('formidable');
const nodemailer = require('nodemailer');

const mongoUrl = 'mongodb://praveen:praveen123@localhost:27017'; // MongoDB connection URL
const dbName = 'doctorDB';
const doctorsCollectionName = 'doctors';
const appointmentsCollectionName = 'appointments';

// Initialize Express app
const app = express();

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function getDoctorEmailById(doctorId) {
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const doctorsCollection = db.collection(doctorsCollectionName);

        // Find the doctor by their ObjectId
        const doctor = await doctorsCollection.findOne({ _id: new ObjectId(doctorId) });

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        return doctor.email;
    } catch (error) {
        console.error('Error fetching doctor email:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await client.close();
    }
}



// Function to connect to MongoDB and search for doctors
async function searchDoctors(query) {
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db(dbName);
        const doctorsCollection = db.collection(doctorsCollectionName);

        // Query MongoDB for doctors matching the query
        const regex = new RegExp(query, 'i'); // Case-insensitive search
        const queryObj = {
            $or: [
                { name: regex },
                { specialization: regex },
                { establishmentName: regex },
                { establishmentCity: regex }
            ]
        };

        const doctors = await doctorsCollection.find(queryObj).toArray();

        // Ensure there's a timings field for each doctor and email field
        return doctors.map(doctor => ({
            ...doctor,
            timings: doctor.timings || [], // Ensure there's a timings field
            email: doctor.email || '' // Ensure there's an email field
        }));
    } catch (error) {
        console.error('Error connecting to MongoDB or querying data:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await client.close();
    }
}

// Function to book appointment
async function bookAppointment(data) {
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db(dbName);
        const appointmentsCollection = db.collection(appointmentsCollectionName);

        // Insert appointment data into MongoDB
        const result = await appointmentsCollection.insertOne(data);
        console.log(`New appointment added with ID: ${result.insertedId}`);
    } catch (error) {
        console.error('Error inserting appointment into MongoDB:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await client.close();
    }
}

// Serve HTML file for the root route
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading index.html');
            return;
        }
        res.status(200).send(data);
    });
});

// Handle search for doctors by query
app.get('/search', async (req, res) => {
    const query = req.query.query;

    try {
        const doctors = await searchDoctors(query);

        // Send JSON response with doctors data
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).send('Error fetching doctors');
    }
});
let docid;

// Handle appointment booking
app.post('/book-appointment', (req, res) => {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields) => {
        if (err) {
            console.error('Error parsing form data:', err);
            res.status(500).send('Error parsing form data');
            return;
        }
        let uemail=fields.email;
        let docname=fields.doctorName;
        docid=fields.doctorId;
        const appointmentData = {
            doctorId: fields.doctorId,
            doctorName: fields.doctorName,
            establishmentName: fields.establishmentName,
            userName: fields.name,
            phoneNumber: fields.phoneNumber,
            email: fields.email,
            reason: fields.reason,
            timing: fields.timing,
            doctorEmail: fields.doctorEmail // Ensure this field is included
        };

        try {
            //await bookAppointment(appointmentData);
            await bookAppointment(appointmentData);

            // Get the doctor's email by their ID
            const doctorEmail = await getDoctorEmailById(docid);
            appointmentData.doctorEmail = doctorEmail;
            

            // Send confirmation email to the doctor
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'praveenkumartv@student.tce.edu',
                    pass: 'ilsm zxdk duti lhcg'
                }
            });

            const mailOptions = {
                from: 'praveenkumartv@student.tce.edu',
                to: uemail, // Use doctor's email here
                subject: 'New Appointment Booking',
                text: `Your appoinment registration is successful. Username: ${appointmentData.userName}. Reason: ${appointmentData.reason}, Timing: ${appointmentData.timing}.`
            };
        

            const mailOptions1 = {
                from: 'praveenkumartv@student.tce.edu',
                to: appointmentData.doctorEmail, // Use doctor's email here
                subject: 'New Appointment Booking',
                text: `Your appoinment registration is successful. Username: ${appointmentData.userName}. Reason: ${appointmentData.reason}, Timing: ${appointmentData.timing}.`
            };

            

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }

                
            });

            transporter.sendMail(mailOptions1, function (error, info) {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }

                
            });

            res.status(200).send('Appointment booked successfully');
        } catch (error) {
            console.error('Error booking appointment:', error);
            res.status(500).send('Error booking appointment');
        }
    });
});

// Handle 404 errors for undefined routes
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
