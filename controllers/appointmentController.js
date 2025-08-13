const Appointment = require('../models/Appointment');

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    console.log('User:', req.user); // Debug log
    const { date, time, description, location, doctor, serviceName } = req.body;
    const userId = req.user.id; // Assuming user ID is attached by auth middleware

    const newAppointment = new Appointment({
      user: userId,
      date,
      time,
      description,
      location,
      doctor,
      serviceName,
    });

    await newAppointment.save();
    res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all appointments for the logged-in user
exports.getAppointments = async (req, res) => {
  try {
    console.log('User:', req.user); // Debug log
    const userId = req.user.id; // Assuming user ID is attached by auth middleware

    const appointments = await Appointment.find({ user: userId });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an appointment
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, description, status } = req.body;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { date, time, description, status },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.status(200).json({ message: 'Appointment updated successfully', appointment: updatedAppointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete an appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAppointment = await Appointment.findByIdAndDelete(id);

    if (!deletedAppointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
