import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Stethoscope, User, Hash, Bed, FileText, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdmitPatientForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mrn: '',
    name: '',
    age: '',
    gender: '',
    diagnosis: '',
    bed_number: '',
    history: '',
    examination: '',
    notes: '',
    status: 'Stable' as const,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.mrn.trim()) {
      toast.error('MRN is required');
      return false;
    }
    if (!formData.name.trim()) {
      toast.error('Patient name is required');
      return false;
    }
    if (!formData.age || parseInt(formData.age) < 0 || parseInt(formData.age) > 150) {
      toast.error('Please enter a valid age (0-150)');
      return false;
    }
    if (!formData.gender) {
      toast.error('Gender is required');
      return false;
    }
    if (!formData.diagnosis.trim()) {
      toast.error('Diagnosis is required');
      return false;
    }
    if (!formData.bed_number.trim()) {
      toast.error('Bed number is required');
      return false;
    }
    if (!formData.history.trim()) {
      toast.error('Patient history is required');
      return false;
    }
    if (!formData.examination.trim()) {
      toast.error('Physical examination is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userString = localStorage.getItem('user');
      if (!userString) {
        toast.error('Please log in again');
        navigate('/login');
        return;
      }

      const user = JSON.parse(userString);

      // Check if MRN already exists
      const { data: existingPatient, error: checkError } = await supabase
        .from('patients')
        .select('mrn')
        .eq('mrn', formData.mrn)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingPatient) {
        toast.error('A patient with this MRN already exists');
        return;
      }

      // Check if bed is available
      const { data: existingBed, error: bedError } = await supabase
        .from('patients')
        .select('id')
        .eq('bed_number', formData.bed_number)
        .neq('status', 'Discharged')
        .single();

      if (bedError && bedError.code !== 'PGRST116') {
        throw bedError;
      }

      if (existingBed) {
        toast.error('This bed is already occupied');
        return;
      }

      // Insert the patient with the current user's ID
      const { data: newPatient, error: insertError } = await supabase
        .from('patients')
        .insert({
          ...formData,
          age: parseInt(formData.age),
          admission_date: new Date().toISOString(),
          attending_physician_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to admit patient');
      }

      if (!newPatient) {
        throw new Error('No patient data returned after insertion');
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          type: 'status',
          message: `New patient admitted: ${formData.name}`,
          severity: 'info',
          user_id: user.id,
          patient_id: newPatient.id,
          created_at: new Date().toISOString()
        });

      toast.success('Patient admitted successfully');
      navigate(`/patients/${newPatient.id}`);
    } catch (error) {
      console.error('Error admitting patient:', error);
      toast.error('Failed to admit patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            New Patient Admission
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  Medical Record Number (MRN)
                </div>
              </label>
              <input
                type="text"
                name="mrn"
                required
                value={formData.mrn}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter MRN"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Patient Name
                </div>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Full name"
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                name="age"
                required
                value={formData.age}
                onChange={handleChange}
                min="0"
                max="150"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Stethoscope className="h-4 w-4 mr-1" />
                  Primary Diagnosis
                </div>
              </label>
              <input
                type="text"
                name="diagnosis"
                required
                value={formData.diagnosis}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Primary diagnosis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Bed className="h-4 w-4 mr-1" />
                  Bed Number
                </div>
              </label>
              <input
                type="text"
                name="bed_number"
                required
                value={formData.bed_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Bed number"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  History
                </div>
              </label>
              <textarea
                name="history"
                required
                value={formData.history}
                onChange={handleChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Patient history"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Physical Examination
                </div>
              </label>
              <textarea
                name="examination"
                required
                value={formData.examination}
                onChange={handleChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Examination findings"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Any additional notes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Status
              </label>
              <select
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="Stable">Stable</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Admitting...' : 'Admit Patient'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}