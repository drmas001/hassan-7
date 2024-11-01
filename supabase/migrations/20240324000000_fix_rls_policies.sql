-- Drop existing RLS policies for patients
DROP POLICY IF EXISTS "Users can view all patients" ON patients;
DROP POLICY IF EXISTS "Users can update their assigned patients" ON patients;
DROP POLICY IF EXISTS "Users can insert patients" ON patients;

-- Create comprehensive RLS policies for patients
CREATE POLICY "Enable read access for all authenticated users"
ON patients FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON patients FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for attending physicians and admins"
ON patients FOR UPDATE
USING (
  auth.uid() = attending_physician_id 
  OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Admin'
  )
);

-- Create policy for delete (restricted to admins)
CREATE POLICY "Enable delete for admins only"
ON patients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Admin'
  )
);