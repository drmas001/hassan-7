import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, ClipboardList, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type Patient = Database['public']['Tables']['patients']['Row'];

interface DischargeFormProps {
  patient: Patient;
  onDischarge: () => void;
}

export function DischargeForm({ patient, onDischarge }: DischargeFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    discharge_date: new Date().toISOString().split('T')[0],
    discharge_diagnosis: patient.diagnosis,
    discharge_summary: '',
    discharge_medications: '',
    follow_up_instructions: '',
    discharge_condition: 'Improved' as 'Improved' | 'died',
  });

  const validateForm = () => {
    if (!formData.discharge_date) {
      toast.error('Discharge date is required');
      return false;
    }
    if (!formData.discharge_diagnosis.trim()) {
      toast.error('Discharge diagnosis is required');
      return false;
    }
    if (!formData.discharge_summary.trim()) {
      toast.error('Discharge summary is required');
      return false;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      // Start a transaction using multiple queries
      const { error: dischargeError } = await supabase
        .from('discharges')
        .insert({
          patient_id: patient.id,
          ...formData,
          discharged_by: user.id,
          created_at: new Date().toISOString()
        });

      if (dischargeError) {
        console.error('Discharge error:', dischargeError);
        throw new Error('Failed to create discharge record');
      }

      // Update patient status
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          status: 'Discharged',
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);

      if (updateError) {
        console.error('Patient update error:', updateError);
        throw new Error('Failed to update patient status');
      }

      // Update medications
      const { error: medicationError } = await supabase
        .from('medications')
        .update({
          status: 'Completed',
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('patient_id', patient.id)
        .eq('status', 'Active');

      if (medicationError) {
        console.error('Medication update error:', medicationError);
        // Don't throw here as this is not critical
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          type: 'discharge',
          message: `Patient ${patient.name} has been discharged (${formData.discharge_condition})`,
          severity: formData.discharge_condition === 'died' ? 'critical' : 'info',
          user_id: user.id,
          patient_id: patient.id,
          created_at: new Date().toISOString()
        });

      toast.success('Patient discharged successfully');
      onDischarge();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error discharging patient:', error);
      toast.error('Failed to discharge patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Discharge Form - {patient.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          MRN: {patient.mrn} | Admission Date: {new Date(patient.admission_date).toLocaleDateString()}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Discharge Date
              </div>
            </label>
            <input
              type="date"
              name="discharge_date"
              required
              value={formData.discharge_date}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Discharge Diagnosis
              </div>
            </label>
            <input
              type="text"
              name="discharge_diagnosis"
              required
              value={formData.discharge_diagnosis}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-1" />
                Discharge Summary
              </div>
            </label>
            <textarea
              name="discharge_summary"
              required
              value={formData.discharge_summary}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Brief summary of hospital course and outcomes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discharge Medications
            </label>
            <textarea
              name="discharge_medications"
              required
              value={formData.discharge_medications}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="List all medications to continue after discharge"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Follow-up Instructions
            </label>
            <textarea
              name="follow_up_instructions"
              required
              value={formData.follow_up_instructions}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Follow-up appointments, care instructions, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discharge Condition
            </label>
            <select
              name="discharge_condition"
              required
              value={formData.discharge_condition}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="Improved">Improved</option>
              <option value="died">Died</option>
            </select>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end space-x-3">
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
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Discharge Patient'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}