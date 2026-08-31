CREATE TABLE public.bank_rates (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  loan_type text not null,
  min_rate numeric not null,
  max_rate numeric not null,
  processing_fee text,
  source text not null default 'Bank website',
  effective_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_name, loan_type)
);

GRANT SELECT ON public.bank_rates TO anon;
GRANT SELECT ON public.bank_rates TO authenticated;
GRANT ALL ON public.bank_rates TO service_role;

ALTER TABLE public.bank_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank rates are publicly readable" ON public.bank_rates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage bank rates" ON public.bank_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bank_rates_updated_at BEFORE UPDATE ON public.bank_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.bank_rates (bank_name, loan_type, min_rate, max_rate, processing_fee, source, effective_date) VALUES
('State Bank of India','home',8.25,9.65,'0.35% (min ₹2,000)','SBI published card rates','2026-08-01'),
('HDFC Bank','home',8.45,9.85,'Up to 0.50%','HDFC published card rates','2026-08-01'),
('ICICI Bank','home',8.50,9.90,'Up to 0.50%','ICICI published card rates','2026-08-01'),
('Axis Bank','home',8.60,10.05,'Up to 1.00%','Axis published card rates','2026-08-01'),
('Bank of Baroda','home',8.30,10.10,'Up to 0.50%','BoB published card rates','2026-08-01'),
('Punjab National Bank','home',8.35,9.95,'0.35% (min ₹2,500)','PNB published card rates','2026-08-01'),
('Kotak Mahindra Bank','home',8.65,9.80,'Up to 0.50%','Kotak published card rates','2026-08-01'),
('LIC Housing Finance','home',8.40,9.70,'Up to 0.25%','LIC HFL published card rates','2026-08-01'),
('State Bank of India','car',9.05,10.15,'Up to ₹10,000','SBI published card rates','2026-08-01'),
('HDFC Bank','car',9.20,10.50,'Up to 1.00%','HDFC published card rates','2026-08-01'),
('ICICI Bank','car',9.10,10.75,'Up to 2.00%','ICICI published card rates','2026-08-01'),
('Axis Bank','car',9.30,11.00,'Up to 1.50%','Axis published card rates','2026-08-01'),
('State Bank of India','personal',11.15,15.30,'Up to 1.50%','SBI published card rates','2026-08-01'),
('HDFC Bank','personal',10.85,21.00,'Up to 2.50%','HDFC published card rates','2026-08-01'),
('ICICI Bank','personal',10.80,16.50,'Up to 2.50%','ICICI published card rates','2026-08-01'),
('Axis Bank','personal',11.10,22.00,'Up to 2.00%','Axis published card rates','2026-08-01'),
('State Bank of India','education',8.05,11.15,'Nil to ₹10,000','SBI published card rates','2026-08-01'),
('Bank of Baroda','education',8.15,11.35,'Nil for select schemes','BoB published card rates','2026-08-01'),
('State Bank of India','business',11.20,16.30,'Up to 1.00%','SBI published card rates','2026-08-01'),
('HDFC Bank','business',11.90,21.35,'Up to 2.00%','HDFC published card rates','2026-08-01');