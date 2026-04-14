import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  ArrowLeft,
  ArrowLeftCircle,
  ArrowRightCircle,
  Mail,
  Lock,
  User,
  Calendar,
  Eye,
  EyeOff,
  Upload,
  FileText,
  HardHat,
  Wrench,
  Search,
  Store,
  UserRound,
} from 'lucide-react';
import logoEpaayos from '../../assets/epaayosLOGO.png';
import AddressTabsSelector from '../../components/AddressTabsSelector.jsx';

// Match landing page palette
const navyDeep = '#04133d';
const navy = '#081F5C';
const navyMuted = '#0b2b73';
const navyBright = '#1447a6';
const navyGlow = '#2a63cc';

const bvIce = '#eef2ff';
const bvPeriwinkle = '#e0e7ff';
const bvLilac = '#e9e5ff';
const bvSoft = '#c7d2fe';
const bvViolet = '#a5b4fc';

const borderNavySoft = 'rgba(8, 31, 92, 0.12)';
const borderBvSoft = 'rgba(99, 102, 241, 0.18)';
const textBodyOnLight = 'rgba(8, 31, 92, 0.72)';

/** Gradient navy blue — match landing page hero */
const gradientNavyBlue = `linear-gradient(135deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 62%, ${navyBright} 100%)`;

/** Hero mesh: navy atmosphere + light blue-violet glows (landing page) */
const gradientHeroMesh = `
  radial-gradient(ellipse 85% 65% at 100% -8%, rgba(147, 197, 253, 0.28) 0%, transparent 52%),
  radial-gradient(ellipse 75% 55% at -5% 105%, rgba(167, 139, 250, 0.22) 0%, transparent 50%),
  radial-gradient(ellipse 55% 45% at 88% 92%, ${navyGlow}44 0%, transparent 52%),
  radial-gradient(ellipse 70% 50% at 15% 20%, rgba(255, 255, 255, 0.07) 0%, transparent 48%)
`;

const gradientNavyButton = `linear-gradient(135deg, ${navy} 0%, ${navyMuted} 42%, ${navyBright} 78%, ${navyGlow} 100%)`;
const gradientLightBlueViolet = `linear-gradient(155deg, #ffffff 0%, ${bvIce} 28%, ${bvPeriwinkle} 55%, ${bvLilac} 100%)`;
const gradientLightBlueVioletAlt = `linear-gradient(135deg, #ffffff 0%, ${bvIce} 40%, #f5f3ff 100%)`;
const gradientBlueVioletButton = `linear-gradient(135deg, ${bvPeriwinkle} 0%, ${bvSoft} 45%, ${bvViolet} 100%)`;

const Register = () => {
  const registrationContentRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isRoleSelected, setIsRoleSelected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [registrationSuccessOpen, setRegistrationSuccessOpen] = useState(false);

  const [formData, setFormData] = useState({
    role: '',
    employedByShopOwnerId: '',
    // shared
    fullName: '',
    gender: '', // used as Sex for mechanic-technician
    birthdate: '',
    civilStatus: '',

    // educational background (mechanic-technician)
    highestEducationalLevel: '',
    yearGraduatedLastAttended: '',
    schoolUniversity: '',
    courseProgram: '',

    // business / shop information (shop-owner)
    shopName: '',
    businessType: '',
    repairServicesOffered: [],
    serviceType: '',
    yearsOfOperation: '',
    numberOfEmployees: '',
    operatingHours: '',
    daysOfOperation: [],
    shopDescription: '',

    // shop location & facilities (shop-owner)
    shopRegion: '',
    shopProvince: '',
    shopCityMunicipality: '',
    shopBarangay: '',
    shopDetailedAddress: '',
    shopLandmark: '',
    // removed: available equipment & specialization (per requirement)

    // business registration details (shop-owner)
    dtiSecRegistrationNumber: '',
    businessPermitNumber: '',
    tinNumber: '',
    businessPermitCertificate: null,

    // work experience (mechanic-technician)
    workCompanyName: '',
    workCompanyAddress: '',
    workRegion: '',
    workProvince: '',
    workCityMunicipality: '',
    workBarangay: '',
    workDetailedAddress: '',
    workPositionHeld: '',
    workInclusiveFrom: '',
    workInclusiveTo: '',
    workAppointmentStatus: '',

    // 21st century skills (mechanic-technician)
    skillsSelfAssessment: [],

    // technical skills acquired without formal training (mechanic-technician)
    technicalSkillsNoFormalTraining: [],

    // name parts (mechanic-technician)
    lastName: '',
    firstName: '',
    middleName: '',

    // place of birth (mechanic-technician)
    pobRegion: '',
    pobProvince: '',
    pobCityMunicipality: '',
    pobBarangay: '',

    // present address (shared fields are region/province/cityMunicipality/barangay)
    region: '',
    province: '',
    cityMunicipality: '',
    barangay: '',
    detailedAddress: '',
    postalCode: '',

    // permanent address (mechanic-technician)
    permanentRegion: '',
    permanentProvince: '',
    permanentCityMunicipality: '',
    permanentBarangay: '',

    employmentStatusCategory: '',
    employmentStatusDetail: '',

    phoneCode: '+63',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    validId: null,
    selfie: null,
    idType: ''
  });
  const [operatingHoursParts, setOperatingHoursParts] = useState({
    openHH: '',
    openMM: '',
    openPeriod: 'AM',
    closeHH: '',
    closeMM: '',
    closePeriod: 'PM',
  });
  const [validIdPreview, setValidIdPreview] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  /** After choosing Mechanic/Technician: pick shop here first; Confirm opens the normal registration steps. */
  const [mechanicShopGateOpen, setMechanicShopGateOpen] = useState(false);
  const [registeredShopOwners, setRegisteredShopOwners] = useState([]);
  const [loadingShopOwners, setLoadingShopOwners] = useState(false);
  const [shopOwnersLoadError, setShopOwnersLoadError] = useState('');
  const [shopOwnerListSearch, setShopOwnerListSearch] = useState('');

  const ROLE_OPTIONS = [
    {
      value: 'shop-owner',
      label: 'Shop Owner',
      description: 'Manage your shop, services, and appointments.',
      Icon: Store,
      iconColor: '#0f766e',
      iconBgIdle: 'linear-gradient(145deg, rgba(15,118,110,0.16) 0%, rgba(45,212,191,0.28) 100%)',
      iconBgActive: 'linear-gradient(145deg, rgba(15,118,110,0.28) 0%, rgba(13,148,136,0.42) 100%)',
    },
    {
      value: 'independent-mechanic-technician',
      label: 'Independent Mechanic / Technician',
      description: 'No shop of your own—work independently and offer services like a shop owner.',
      Icon: HardHat,
      iconColor: '#b45309',
      iconBgIdle: 'linear-gradient(145deg, rgba(180,83,9,0.14) 0%, rgba(251,191,36,0.28) 100%)',
      iconBgActive: 'linear-gradient(145deg, rgba(180,83,9,0.26) 0%, rgba(217,119,6,0.4) 100%)',
    },
    {
      value: 'mechanic-technician',
      label: 'Mechanic / Technician',
      description: 'Offer repair services and accept jobs.',
      Icon: Wrench,
      iconColor: '#c2410c',
      iconBgIdle: 'linear-gradient(145deg, rgba(194,65,12,0.14) 0%, rgba(251,146,60,0.3) 100%)',
      iconBgActive: 'linear-gradient(145deg, rgba(194,65,12,0.26) 0%, rgba(234,88,12,0.4) 100%)',
    },
    {
      value: 'customer',
      label: 'Customer',
      description: 'Book services and track your requests.',
      Icon: UserRound,
      iconColor: '#6d28d9',
      iconBgIdle: 'linear-gradient(145deg, rgba(109,40,217,0.14) 0%, rgba(167,139,250,0.32) 100%)',
      iconBgActive: 'linear-gradient(145deg, rgba(109,40,217,0.26) 0%, rgba(124,58,237,0.42) 100%)',
    },
  ];

  // PSGC (complete PH address options)
  const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';
  const NCR_REGION_CODE = '130000000';

  const FALLBACK_REGIONS = [{ code: 'MIMAROPA', name: 'MIMAROPA (Region IV-B)' }];
  const [psgcRegions, setPsgcRegions] = useState(FALLBACK_REGIONS);
  const [psgcProvincesByRegion, setPsgcProvincesByRegion] = useState({});
  const [psgcCitiesByProvince, setPsgcCitiesByProvince] = useState({});
  const [psgcCitiesByRegion, setPsgcCitiesByRegion] = useState({});
  const [psgcBarangaysByCity, setPsgcBarangaysByCity] = useState({});
  const [isLoadingPSGC, setIsLoadingPSGC] = useState(false);

  const fetchPSGC = async (path) => {
    const res = await fetch(`${PSGC_BASE_URL}${path}`, { method: 'GET' });
    if (!res.ok) throw new Error(`PSGC request failed: ${res.status}`);
    return await res.json();
  };

  const loadRegions = async () => {
    setIsLoadingPSGC(true);
    try {
      const data = await fetchPSGC('/regions/');
      const formatted = (data || []).map((r) => ({ code: String(r.code), name: r.name }));
      if (formatted.length) setPsgcRegions(formatted);
    } catch {
      // keep fallback
    } finally {
      setIsLoadingPSGC(false);
    }
  };

  const loadProvinces = async (regionCode) => {
    if (!regionCode || regionCode === NCR_REGION_CODE) return;
    if (psgcProvincesByRegion[regionCode]) return;
    setIsLoadingPSGC(true);
    try {
      const data = await fetchPSGC(`/regions/${regionCode}/provinces/`);
      const formatted = (data || []).map((p) => ({ code: String(p.code), name: p.name }));
      setPsgcProvincesByRegion((prev) => ({ ...prev, [regionCode]: formatted }));
    } catch {
      setPsgcProvincesByRegion((prev) => ({ ...prev, [regionCode]: [] }));
    } finally {
      setIsLoadingPSGC(false);
    }
  };

  const loadCitiesForRegion = async (regionCode) => {
    if (!regionCode) return;
    if (psgcCitiesByRegion[regionCode]) return;
    setIsLoadingPSGC(true);
    try {
      // NCR has no provinces, cities are under region
      const data =
        (await fetchPSGC(`/regions/${regionCode}/cities-municipalities/`).catch(() => null)) ||
        (await fetchPSGC(`/regions/${regionCode}/cities/`).catch(() => []));
      const formatted = (data || []).map((c) => ({ code: String(c.code), name: c.name }));
      setPsgcCitiesByRegion((prev) => ({ ...prev, [regionCode]: formatted }));
    } catch {
      setPsgcCitiesByRegion((prev) => ({ ...prev, [regionCode]: [] }));
    } finally {
      setIsLoadingPSGC(false);
    }
  };

  const loadCitiesForProvince = async (provinceCode) => {
    if (!provinceCode) return;
    if (psgcCitiesByProvince[provinceCode]) return;
    setIsLoadingPSGC(true);
    try {
      const data = await fetchPSGC(`/provinces/${provinceCode}/cities-municipalities/`);
      const formatted = (data || []).map((c) => ({ code: String(c.code), name: c.name }));
      setPsgcCitiesByProvince((prev) => ({ ...prev, [provinceCode]: formatted }));
    } catch {
      setPsgcCitiesByProvince((prev) => ({ ...prev, [provinceCode]: [] }));
    } finally {
      setIsLoadingPSGC(false);
    }
  };

  const loadBarangays = async (cityCode) => {
    if (!cityCode) return;
    if (psgcBarangaysByCity[cityCode]) return;
    setIsLoadingPSGC(true);
    try {
      const data = await fetchPSGC(`/cities-municipalities/${cityCode}/barangays/`);
      const formatted = (data || []).map((b) => ({ code: String(b.code), name: b.name }));
      setPsgcBarangaysByCity((prev) => ({ ...prev, [cityCode]: formatted }));
    } catch {
      setPsgcBarangaysByCity((prev) => ({ ...prev, [cityCode]: [] }));
    } finally {
      setIsLoadingPSGC(false);
    }
  };

  useEffect(() => {
    // load complete list for better UX
    loadRegions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { number: 1, title: 'Personal Info' },
    { number: 2, title: 'Address & Contact' },
    { number: 3, title: 'Account Details' },
    { number: 4, title: 'ID Verification' }
  ];

  const isMechanic = formData.role === 'mechanic-technician';
  const isIndependentMechanic = formData.role === 'independent-mechanic-technician';
  const isShopOwnerFlow = formData.role === 'shop-owner' || isIndependentMechanic;
  const isExtendedRegistration = isMechanic || isShopOwnerFlow;

  const getActiveSteps = () => {
    if (isMechanic) {
      return [
        { number: 1, title: 'Personal Info' },
        { number: 2, title: 'Educational Background' },
        { number: 3, title: 'Work Experience' },
        { number: 4, title: '21st Century Skills' },
        { number: 5, title: 'Account Details' },
        { number: 6, title: 'ID Verification' },
      ];
    }
    if (isShopOwnerFlow) {
      if (isIndependentMechanic) {
        return [
          { number: 1, title: 'Personal Info' },
          { number: 2, title: 'Business Information' },
          { number: 3, title: 'Location & Address' },
          { number: 4, title: 'Educational Background & 21st Century Skills' },
          { number: 5, title: 'Account Details' },
          { number: 6, title: 'ID Verification' },
        ];
      }
      return [
        { number: 1, title: 'Personal Info' },
        { number: 2, title: 'Business / Shop Information' },
        { number: 3, title: 'Shop Location & Address' },
        { number: 4, title: 'Business Registration Details' },
        { number: 5, title: 'Account Details' },
        { number: 6, title: 'ID Verification' },
      ];
    }
    return steps;
  };

  const activeSteps = getActiveSteps();

  useEffect(() => {
    if (!mechanicShopGateOpen) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingShopOwners(true);
      setShopOwnersLoadError('');
      try {
        const API_URL = getApiBaseUrl();
        const res = await fetch(`${API_URL}/api/users/register/shop-owners`);
        if (!res.ok) throw new Error('Could not load registered shops');
        const data = await res.json();
        if (!cancelled) setRegisteredShopOwners(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setShopOwnersLoadError(e?.message || 'Failed to load shops');
      } finally {
        if (!cancelled) setLoadingShopOwners(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mechanicShopGateOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addressSelectorCommonProps = {
    formData,
    errors,
    handleInputChange,
    psgcRegions,
    psgcProvincesByRegion,
    psgcCitiesByProvince,
    psgcCitiesByRegion,
    psgcBarangaysByCity,
    isLoadingPSGC,
    NCR_REGION_CODE,
    loadProvinces,
    loadCitiesForRegion,
    loadCitiesForProvince,
    loadBarangays,
  };

  const computeAge = (isoDate) => {
    if (!isoDate) return '';
    const today = new Date();
    const birthDate = new Date(isoDate);
    if (Number.isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return String(Math.max(age, 0));
  };

  const formatMonthYearForStorage = (monthInputValue) => {
    if (!monthInputValue) return '';
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthInputValue);
    if (!match) return '';
    const [, year, month] = match;
    return `${month}/${year}`;
  };

  const formatMonthYearForInput = (storedValue) => {
    if (!storedValue) return '';
    const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(storedValue.trim());
    if (!match) return '';
    const [, month, year] = match;
    return `${year}-${month}`;
  };

  const openMonthPicker = (e) => {
    const input = e.currentTarget;
    if (typeof input?.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Browser/user-gesture restrictions can block showPicker; default behavior still works.
      }
    }
  };

  const currentMonthInputValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  /** DB values for `serviceType`; labels differ from shop-owner registration for independent only. */
  const INDEPENDENT_SERVICE_TYPE_OPTIONS = [
    { value: 'Home Service', label: 'Home Service' },
    { value: 'Shop Visit', label: 'Technician/Mechanic location Visit' },
    { value: 'Both', label: 'Both (Home Service, Technician/Mechanic location Visit)' },
  ];

  const mapServiceTypeForIndependent = (prev) => {
    if (!prev || typeof prev !== 'string') return '';
    if (prev === 'Both (Home Service and Shop Visit)' || prev === 'Both') return 'Both';
    if (prev === 'Home Service' || prev === 'Shop Visit') return prev;
    return '';
  };

  const mapServiceTypeForShopOwner = (prev) => {
    if (!prev || typeof prev !== 'string') return '';
    if (prev === 'Both' || prev === 'Both (Home Service and Shop Visit)') return 'Both (Home Service and Shop Visit)';
    if (prev === 'Home Service' || prev === 'Shop Visit') return prev;
    return '';
  };

  const selectRole = (roleValue) => {
    if (roleValue === 'mechanic-technician') {
      setFormData(prev => ({ ...prev, role: roleValue, employedByShopOwnerId: '' }));
      setErrors(prev => ({ ...prev, role: '', employedByShopOwnerId: '', general: '' }));
      setValidationAttempted(false);
      setShopOwnerListSearch('');
      setMechanicShopGateOpen(true);
      return;
    }
    setMechanicShopGateOpen(false);
    setFormData((prev) => {
      let next = {
        ...prev,
        role: roleValue,
        employedByShopOwnerId: '',
      };
      if (roleValue === 'independent-mechanic-technician') {
        next = {
          ...next,
          shopName: '',
          numberOfEmployees: '',
          serviceType: mapServiceTypeForIndependent(prev.serviceType),
        };
      } else if (roleValue === 'shop-owner') {
        next = {
          ...next,
          serviceType: mapServiceTypeForShopOwner(prev.serviceType),
        };
      }
      return next;
    });
    setErrors(prev => ({ ...prev, role: '', employedByShopOwnerId: '' }));
    setValidationAttempted(false);
    setIsRoleSelected(true);
    setCurrentStep(1);
  };

  const cancelMechanicShopGate = () => {
    setMechanicShopGateOpen(false);
    setFormData(prev => ({ ...prev, role: '', employedByShopOwnerId: '' }));
    setShopOwnerListSearch('');
    setErrors(prev => ({ ...prev, employedByShopOwnerId: '', general: '' }));
    setValidationAttempted(false);
  };

  const confirmMechanicShopGate = () => {
    if (!String(formData.employedByShopOwnerId || '').trim()) {
      setValidationAttempted(true);
      setErrors(prev => ({ ...prev, employedByShopOwnerId: 'Please select a shop from the list' }));
      return;
    }
    setErrors(prev => ({ ...prev, employedByShopOwnerId: '' }));
    setMechanicShopGateOpen(false);
    setIsRoleSelected(true);
    setCurrentStep(1);
  };

  const changeRole = () => {
    setIsRoleSelected(false);
    setMechanicShopGateOpen(false);
    setCurrentStep(1);
    setValidationAttempted(false);
    setFormData(prev => ({ ...prev, employedByShopOwnerId: '' }));
    setShopOwnerListSearch('');
    setErrors(prev => ({ ...prev, role: '', employedByShopOwnerId: '' }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.role.trim()) newErrors.role = 'Please select your role';

      if (isExtendedRegistration) {
        if (isMechanic && !String(formData.employedByShopOwnerId || '').trim()) {
          newErrors.employedByShopOwnerId = 'Shop owner is required — go back and complete shop selection';
        }
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.birthdate) newErrors.birthdate = 'Birth date is required';
        if (!formData.gender) newErrors.gender = 'Please select your sex';
        if (!formData.civilStatus) newErrors.civilStatus = 'Please select your civil status';

        if (!formData.pobRegion) newErrors.pobRegion = 'Region is required';
        if (!formData.pobProvince) newErrors.pobProvince = 'Province is required';
        if (!formData.pobCityMunicipality) newErrors.pobCityMunicipality = 'City/Municipality is required';
        if (!formData.pobBarangay) newErrors.pobBarangay = 'Barangay is required';

        if (!formData.region) newErrors.region = 'Present address region is required';
        if (!formData.province) newErrors.province = 'Present address province is required';
        if (!formData.cityMunicipality) newErrors.cityMunicipality = 'Present address city/municipality is required';
        if (!formData.barangay) newErrors.barangay = 'Present address barangay is required';

        if (!formData.permanentRegion) newErrors.permanentRegion = 'Permanent address region is required';
        if (!formData.permanentProvince) newErrors.permanentProvince = 'Permanent address province is required';
        if (!formData.permanentCityMunicipality) newErrors.permanentCityMunicipality = 'Permanent address city/municipality is required';
        if (!formData.permanentBarangay) newErrors.permanentBarangay = 'Permanent address barangay is required';

        if (!formData.phoneNumber.trim()) {
          newErrors.phoneNumber = 'Mobile number is required';
        } else if (!/^\d{10,11}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
          newErrors.phoneNumber = 'Enter a valid mobile number (10-11 digits)';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Enter a valid email';
        }

        if (!formData.employmentStatusCategory) newErrors.employmentStatusCategory = 'Employment status is required';
        if (!formData.employmentStatusDetail) newErrors.employmentStatusDetail = 'Please select employment status detail';
      } else {
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.gender) newErrors.gender = 'Please select your gender';
        if (!formData.birthdate) {
          newErrors.birthdate = 'Birth date is required';
        } else {
          const age = Number(computeAge(formData.birthdate));
          if (Number.isFinite(age) && age < 18) newErrors.birthdate = 'You must be at least 18 years old';
        }
      }
    }

    if (!isExtendedRegistration && step === 2) {
      if (!formData.region.trim()) newErrors.region = 'Region is required';
      if (!formData.province.trim()) newErrors.province = 'Province is required';
      if (!formData.cityMunicipality.trim()) newErrors.cityMunicipality = 'City/Municipality is required';
      if (!formData.barangay.trim()) newErrors.barangay = 'Barangay is required';
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^\d{10,11}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
        newErrors.phoneNumber = 'Enter a valid phone number (10-11 digits)';
      }
    }

    if (isMechanic && step === 2) {
      if (!formData.highestEducationalLevel) newErrors.highestEducationalLevel = 'Highest educational level is required';
      if (formData.yearGraduatedLastAttended.trim()) {
        const v = formData.yearGraduatedLastAttended.trim();
        if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(v)) {
          newErrors.yearGraduatedLastAttended = 'Use month/year format';
        }
      }
      if (!formData.schoolUniversity.trim()) newErrors.schoolUniversity = 'School/University is required';
      if (!formData.courseProgram.trim()) newErrors.courseProgram = 'Course/Program is required';
    }

    if (isIndependentMechanic && step === 4) {
      if (!formData.highestEducationalLevel) newErrors.highestEducationalLevel = 'Highest educational level is required';
      if (formData.yearGraduatedLastAttended.trim()) {
        const v = formData.yearGraduatedLastAttended.trim();
        if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(v)) {
          newErrors.yearGraduatedLastAttended = 'Use month/year format';
        }
      }
      if (!formData.schoolUniversity.trim()) newErrors.schoolUniversity = 'School/University is required';
      if (!formData.courseProgram.trim()) newErrors.courseProgram = 'Course/Program is required';
    }

    if (isShopOwnerFlow && step === 2) {
      if (!isIndependentMechanic && !formData.shopName.trim()) newErrors.shopName = 'Shop name is required';
      if (!formData.businessType) newErrors.businessType = 'Type of business is required';

      const repair = Array.isArray(formData.repairServicesOffered) ? formData.repairServicesOffered : [];
      if (repair.length < 1) newErrors.repairServicesOffered = 'Select at least one repair service offered';

      if (!formData.serviceType) newErrors.serviceType = 'Service type is required';

      if (!String(formData.yearsOfOperation || '').trim()) {
        newErrors.yearsOfOperation = 'Years of operation is required';
      } else if (!/^\d{1,2}$/.test(String(formData.yearsOfOperation).trim())) {
        newErrors.yearsOfOperation = 'Enter a valid number of years';
      }

      if (!isIndependentMechanic) {
        if (!String(formData.numberOfEmployees || '').trim()) {
          newErrors.numberOfEmployees = 'Number of employees/mechanics is required';
        } else if (!/^\d{1,3}$/.test(String(formData.numberOfEmployees).trim())) {
          newErrors.numberOfEmployees = 'Enter a valid number';
        }
      }

      if (!formData.operatingHours.trim()) newErrors.operatingHours = 'Operating hours is required';

      const days = Array.isArray(formData.daysOfOperation) ? formData.daysOfOperation : [];
      if (days.length < 1) newErrors.daysOfOperation = 'Select at least one day of operation';
    }

    if (isMechanic && step === 3) {
      if (!formData.workCompanyName.trim()) newErrors.workCompanyName = 'Name of office/company is required';
      if (!formData.workRegion) newErrors.workRegion = 'Region is required';
      if (!formData.workProvince) newErrors.workProvince = 'Province is required';
      if (!formData.workCityMunicipality) newErrors.workCityMunicipality = 'City/Municipality is required';
      if (!formData.workBarangay) newErrors.workBarangay = 'Barangay is required';
      if (!formData.workPositionHeld.trim()) newErrors.workPositionHeld = 'Position held is required';
      if (!formData.workInclusiveFrom.trim()) {
        newErrors.workInclusiveFrom = 'Inclusive dates (from) is required';
      } else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(formData.workInclusiveFrom.trim())) {
        newErrors.workInclusiveFrom = 'Use mm/yyyy (e.g., 06/2024)';
      }
      if (!formData.workInclusiveTo.trim()) {
        newErrors.workInclusiveTo = 'Inclusive dates (to) is required';
      } else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(formData.workInclusiveTo.trim())) {
        newErrors.workInclusiveTo = 'Use mm/yyyy (e.g., 06/2024)';
      }
      if (!formData.workAppointmentStatus.trim()) newErrors.workAppointmentStatus = 'Status of appointment is required';
    }

    if (isShopOwnerFlow && step === 3) {
      if (!formData.shopRegion) newErrors.shopRegion = 'Region is required';
      if (!formData.shopProvince) newErrors.shopProvince = 'Province is required';
      if (!formData.shopCityMunicipality) newErrors.shopCityMunicipality = 'City/Municipality is required';
      if (!formData.shopBarangay) newErrors.shopBarangay = 'Barangay is required';

      // removed: available equipment & specialization (per requirement)
    }

    if ((isMechanic || isIndependentMechanic) && step === 4) {
      const skills = Array.isArray(formData.skillsSelfAssessment) ? formData.skillsSelfAssessment : [];
      if (skills.length !== 5) newErrors.skillsSelfAssessment = 'Please check exactly five (5) skills';
      const tech = Array.isArray(formData.technicalSkillsNoFormalTraining) ? formData.technicalSkillsNoFormalTraining : [];
      if (tech.length < 1) newErrors.technicalSkillsNoFormalTraining = 'Select at least one technical skill';
    }

    if (isShopOwnerFlow && step === 4 && !isIndependentMechanic) {
      if (!formData.dtiSecRegistrationNumber.trim()) newErrors.dtiSecRegistrationNumber = 'DTI/SEC registration number is required';
      if (!formData.businessPermitNumber.trim()) newErrors.businessPermitNumber = 'Business permit number is required';
      if (!formData.businessPermitCertificate) newErrors.businessPermitCertificate = 'Please upload business permit/certificate';
    }

    if ((!isExtendedRegistration && step === 3) || (isExtendedRegistration && step === 5)) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Enter a valid email';
      }
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Use upper, lower, and a number';
      }
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if ((!isExtendedRegistration && step === 4) || (isExtendedRegistration && step === 6)) {
      if (!formData.validId) {
        newErrors.validId = 'Please upload a valid ID';
      } else if (formData.validId.size > 5 * 1024 * 1024) {
        newErrors.validId = 'File size must be less than 5MB';
      }
      if (!formData.idType) {
        newErrors.idType = 'Please select ID type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    setValidationAttempted(true);
    if (validateStep(currentStep)) {
      if (currentStep < activeSteps.length) setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setValidationAttempted(true);
    const allValid = activeSteps.map(s => s.number).every(step => validateStep(step));
    if (!allValid) return;
    setIsLoading(true);
    try {
      const API_URL = getApiBaseUrl();
      const body = new FormData();
      const computedFullName = isExtendedRegistration
        ? [formData.lastName, formData.firstName, formData.middleName].map(x => (x || '').trim()).filter(Boolean).join(', ')
        : formData.fullName;
      const formattedWorkAddress = formatAddressFrom({
        regionCode: formData.workRegion,
        provinceCode: formData.workProvince,
        cityCode: formData.workCityMunicipality,
        barangayCode: formData.workBarangay,
      }) || [formData.workBarangay, formData.workCityMunicipality, formData.workProvince, formData.workRegion].filter(Boolean).join(', ');
      Object.entries({
        role: formData.role,
        ...(isMechanic ? { employedByShopOwner: formData.employedByShopOwnerId } : {}),
        fullName: computedFullName,
        gender: formData.gender,
        birthdate: formData.birthdate,
        civilStatus: formData.civilStatus,
        highestEducationalLevel: formData.highestEducationalLevel,
        yearGraduatedLastAttended: formData.yearGraduatedLastAttended,
        schoolUniversity: formData.schoolUniversity,
        courseProgram: formData.courseProgram,
        workCompanyName: formData.workCompanyName,
        workCompanyAddress: formattedWorkAddress || formData.workCompanyAddress,
        workRegion: formData.workRegion,
        workProvince: formData.workProvince,
        workCityMunicipality: formData.workCityMunicipality,
        workBarangay: formData.workBarangay,
        workPositionHeld: formData.workPositionHeld,
        workInclusiveFrom: formData.workInclusiveFrom,
        workInclusiveTo: formData.workInclusiveTo,
        workAppointmentStatus: formData.workAppointmentStatus,
        skillsSelfAssessment: JSON.stringify(formData.skillsSelfAssessment || []),
        technicalSkillsNoFormalTraining: JSON.stringify(formData.technicalSkillsNoFormalTraining || []),
        shopName: formData.shopName,
        businessType: formData.businessType,
        repairServicesOffered: JSON.stringify(formData.repairServicesOffered || []),
        serviceType: formData.serviceType,
        yearsOfOperation: formData.yearsOfOperation,
        numberOfEmployees: formData.numberOfEmployees,
        operatingHours: formData.operatingHours,
        daysOfOperation: JSON.stringify(formData.daysOfOperation || []),
        shopDescription: formData.shopDescription,
        shopRegion: formData.shopRegion,
        shopProvince: formData.shopProvince,
        shopCityMunicipality: formData.shopCityMunicipality,
        shopBarangay: formData.shopBarangay,
        shopDetailedAddress: formData.shopDetailedAddress,
        shopLandmark: formData.shopLandmark,
        dtiSecRegistrationNumber: formData.dtiSecRegistrationNumber,
        businessPermitNumber: formData.businessPermitNumber,
        tinNumber: formData.tinNumber,
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        pobRegion: formData.pobRegion,
        pobProvince: formData.pobProvince,
        pobCityMunicipality: formData.pobCityMunicipality,
        pobBarangay: formData.pobBarangay,
        region: formData.region,
        province: formData.province,
        cityMunicipality: formData.cityMunicipality,
        barangay: formData.barangay,
        detailedAddress: formData.detailedAddress,
        postalCode: formData.postalCode,
        permanentRegion: formData.permanentRegion,
        permanentProvince: formData.permanentProvince,
        permanentCityMunicipality: formData.permanentCityMunicipality,
        permanentBarangay: formData.permanentBarangay,
        employmentStatusCategory: formData.employmentStatusCategory,
        employmentStatusDetail: formData.employmentStatusDetail,
        phoneCode: '+63',
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        idType: formData.idType
      }).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (typeof v === 'string' && !v.trim()) return;
        body.append(k, v);
      });
      if (formData.validId) body.append('validId', formData.validId);
      if (formData.selfie) body.append('selfie', formData.selfie);
      if (formData.businessPermitCertificate) body.append('businessPermitCertificate', formData.businessPermitCertificate);

      const res = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        body
      });
      if (!res.ok) {
        let serverMessage = 'Registration failed';
        const parsed = await res.json().catch(() => null);
        if (parsed?.message) {
          serverMessage = parsed.message;
        }
        throw new Error(serverMessage);
      }
      await res.json();
      setRegistrationSuccessOpen(true);
    } catch (e) {
      setErrors({ general: e?.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Display helpers for summary
  const getRegionName = () => {
    const r = psgcRegions.find(x => x.code === formData.region);
    return r ? r.name : '';
  };
  const getProvinceName = () => {
    const list = psgcProvincesByRegion[formData.region] || [];
    const p = list.find(x => x.code === formData.province);
    return p ? p.name : '';
  };
  const getCityName = () => {
    const list =
      formData.region === NCR_REGION_CODE
        ? (psgcCitiesByRegion[formData.region] || [])
        : (psgcCitiesByProvince[formData.province] || []);
    const c = list.find(x => x.code === formData.cityMunicipality);
    return c ? c.name : '';
  };
  const getBarangayName = () => {
    const list = psgcBarangaysByCity[formData.cityMunicipality] || [];
    const b = list.find(x => x.code === formData.barangay);
    return b ? b.name : '';
  };
  const formatFullAddress = () => {
    const parts = [];
    if (formData.detailedAddress) parts.push(formData.detailedAddress);
    if (getBarangayName()) parts.push(getBarangayName());
    if (getCityName()) parts.push(getCityName());
    if (getProvinceName()) parts.push(getProvinceName());
    if (getRegionName()) parts.push(getRegionName());
    if (formData.postalCode) parts.push(formData.postalCode);
    return parts.filter(Boolean).join(', ');
  };

  const getRegionNameBy = (regionCode) => {
    const r = psgcRegions.find(x => x.code === regionCode);
    return r ? r.name : '';
  };
  const getProvinceNameBy = (regionCode, provinceCode) => {
    const list = psgcProvincesByRegion[regionCode] || [];
    const p = list.find(x => x.code === provinceCode);
    return p ? p.name : '';
  };
  const getCityNameBy = (regionCode, provinceCode, cityCode) => {
    const list =
      regionCode === NCR_REGION_CODE
        ? (psgcCitiesByRegion[regionCode] || [])
        : (psgcCitiesByProvince[provinceCode] || []);
    const c = list.find(x => x.code === cityCode);
    return c ? c.name : '';
  };
  const getBarangayNameBy = (cityCode, barangayCode) => {
    const list = psgcBarangaysByCity[cityCode] || [];
    const b = list.find(x => x.code === barangayCode);
    return b ? b.name : '';
  };

  const formatAddressFrom = ({ regionCode, provinceCode, cityCode, barangayCode, detailed, postalCode }) => {
    const parts = [];
    if (detailed) parts.push(detailed);
    const brgy = getBarangayNameBy(cityCode, barangayCode);
    const city = getCityNameBy(regionCode, provinceCode, cityCode);
    const prov = getProvinceNameBy(regionCode, provinceCode);
    const reg = getRegionNameBy(regionCode);
    if (brgy) parts.push(brgy);
    if (city) parts.push(city);
    if (prov) parts.push(prov);
    if (reg) parts.push(reg);
    if (postalCode) parts.push(postalCode);
    return parts.filter(Boolean).join(', ');
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">Selected role *</Label>
          <button
            type="button"
            onClick={changeRole}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Change role
          </button>
        </div>
        <div className={`h-10 px-3 border rounded-lg flex items-center justify-between ${validationAttempted && errors.role ? 'border-red-500' : 'border-gray-300'} bg-gray-50`}>
          <span className="text-sm text-gray-900">
            {ROLE_OPTIONS.find(r => r.value === formData.role)?.label || 'Not selected'}
          </span>
        </div>
        {validationAttempted && errors.role && <p className="text-sm text-red-600">{errors.role}</p>}
      </div>

      {isExtendedRegistration ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`h-10 ${validationAttempted && errors.lastName ? 'border-red-500' : ''}`}
              />
              {validationAttempted && errors.lastName && <p className="text-sm text-red-600">{errors.lastName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`h-10 ${validationAttempted && errors.firstName ? 'border-red-500' : ''}`}
              />
              {validationAttempted && errors.firstName && <p className="text-sm text-red-600">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName" className="text-sm font-medium text-gray-700">Middle Name</Label>
              <Input
                id="middleName"
                type="text"
                placeholder="Middle name (optional)"
                value={formData.middleName}
                onChange={(e) => handleInputChange('middleName', e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700">Date of Birth *</Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleInputChange('birthdate', e.target.value)}
                className={`h-10 ${validationAttempted && errors.birthdate ? 'border-red-500' : ''}`}
              />
              {validationAttempted && errors.birthdate && <p className="text-sm text-red-600">{errors.birthdate}</p>}
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="age" className="text-sm font-medium text-gray-700">Age</Label>
              <Input id="age" type="text" value={computeAge(formData.birthdate)} className="h-10 bg-gray-50" disabled />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label className="text-sm font-medium text-gray-700">Sex *</Label>
              <RadioGroup value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="sex-male" />
                    <Label htmlFor="sex-male" className="text-sm text-gray-700">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="sex-female" />
                    <Label htmlFor="sex-female" className="text-sm text-gray-700">Female</Label>
                  </div>
                </div>
              </RadioGroup>
              {validationAttempted && errors.gender && <p className="text-sm text-red-600">{errors.gender}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Civil Status *</Label>
            <Select value={formData.civilStatus} onValueChange={(value) => handleInputChange('civilStatus', value)}>
              <SelectTrigger className={`h-10 ${validationAttempted && errors.civilStatus ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select civil status" />
              </SelectTrigger>
              <SelectContent>
                {['single', 'married', 'widowed', 'separated'].map(v => (
                  <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationAttempted && errors.civilStatus && <p className="text-sm text-red-600">{errors.civilStatus}</p>}
          </div>

          <div className="space-y-3">
            <AddressTabsSelector
              {...addressSelectorCommonProps}
              label="Place of Birth"
              regionKey="pobRegion"
              provinceKey="pobProvince"
              cityKey="pobCityMunicipality"
              barangayKey="pobBarangay"
              errorRegionKey="pobRegion"
              errorProvinceKey="pobProvince"
              errorCityKey="pobCityMunicipality"
              errorBarangayKey="pobBarangay"
            />
          </div>

          <div className="space-y-3">
            <AddressTabsSelector
              {...addressSelectorCommonProps}
              label="Present Address"
              regionKey="region"
              provinceKey="province"
              cityKey="cityMunicipality"
              barangayKey="barangay"
              errorRegionKey="region"
              errorProvinceKey="province"
              errorCityKey="cityMunicipality"
              errorBarangayKey="barangay"
            />
            <div className="space-y-2">
              <Label htmlFor="detailedAddress" className="text-sm font-medium text-gray-700">Detailed present address (optional)</Label>
              <Textarea
                id="detailedAddress"
                placeholder="Unit No., Building, Street, etc."
                value={formData.detailedAddress}
                onChange={(e) => handleInputChange('detailedAddress', e.target.value)}
                className={`w-full h-20 resize-none ${validationAttempted && errors.detailedAddress ? 'border-red-500' : ''}`}
              />
              {validationAttempted && errors.detailedAddress && <p className="text-sm text-red-600">{errors.detailedAddress}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <AddressTabsSelector
              {...addressSelectorCommonProps}
              label="Permanent Address"
              regionKey="permanentRegion"
              provinceKey="permanentProvince"
              cityKey="permanentCityMunicipality"
              barangayKey="permanentBarangay"
              errorRegionKey="permanentRegion"
              errorProvinceKey="permanentProvince"
              errorCityKey="permanentCityMunicipality"
              errorBarangayKey="permanentBarangay"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Mobile Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+63 9XXXXXXXXX"
                value={`+63 ${formData.phoneNumber}`}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  const withoutCode = digitsOnly.startsWith('63') ? digitsOnly.slice(2) : digitsOnly;
                  const limited = withoutCode.slice(0, 11);
                  handleInputChange('phoneNumber', limited);
                }}
                className={`h-10 ${validationAttempted && errors.phoneNumber ? 'border-red-500' : ''}`}
              />
              {validationAttempted && errors.phoneNumber && <p className="text-sm text-red-600">{errors.phoneNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`h-10 ${validationAttempted && errors.email ? 'border-red-500' : ''}`}
              />
              {validationAttempted && errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Employment Status *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select value={formData.employmentStatusCategory} onValueChange={(value) => {
                  handleInputChange('employmentStatusCategory', value);
                  handleInputChange('employmentStatusDetail', '');
                }}>
                  <SelectTrigger className={`h-10 ${validationAttempted && errors.employmentStatusCategory ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                  </SelectContent>
                </Select>
                {validationAttempted && errors.employmentStatusCategory && <p className="text-sm text-red-600">{errors.employmentStatusCategory}</p>}
              </div>
              <div className="space-y-2">
                <Select value={formData.employmentStatusDetail} onValueChange={(value) => handleInputChange('employmentStatusDetail', value)}>
                  <SelectTrigger className={`h-10 ${validationAttempted && errors.employmentStatusDetail ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select detail" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.employmentStatusCategory === 'employed'
                      ? [
                          { value: 'wage-employed', label: 'Wage Employed' },
                          { value: 'self-employed', label: 'Self employed' },
                        ]
                      : formData.employmentStatusCategory === 'unemployed'
                      ? [
                          { value: 'new-entrant-fresh-graduate', label: 'New Entrant/Fresh Graduate' },
                          { value: 'finished-contract', label: 'Finished Contract' },
                          { value: 'resigned', label: 'Resigned' },
                          { value: 'retired', label: 'Retired' },
                          { value: 'terminated-laidoff-local', label: 'Terminated/Laidoff (local)' },
                          { value: 'terminated-laidoff-overseas', label: 'Terminated/Laidoff (overseas)' },
                        ]
                      : []
                    ).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationAttempted && errors.employmentStatusDetail && <p className="text-sm text-red-600">{errors.employmentStatusDetail}</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={`h-10 pl-10 ${validationAttempted && errors.fullName ? 'border-red-500' : ''}`}
                required
              />
            </div>
            {validationAttempted && errors.fullName && <p className="text-sm text-red-600">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Gender *</Label>
            <RadioGroup value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="text-sm text-gray-700">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="text-sm text-gray-700">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefer-not" id="prefer-not" />
                  <Label htmlFor="prefer-not" className="text-sm text-gray-700">Prefer not to say</Label>
                </div>
              </div>
            </RadioGroup>
            {validationAttempted && errors.gender && <p className="text-sm text-red-600">{errors.gender}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700">Birth Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleInputChange('birthdate', e.target.value)}
                className={`h-10 pl-10 ${validationAttempted && errors.birthdate ? 'border-red-500' : ''}`}
                required
              />
            </div>
            {validationAttempted && errors.birthdate && <p className="text-sm text-red-600">{errors.birthdate}</p>}
          </div>
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">Address *</Label>
      <AddressTabsSelector
        {...addressSelectorCommonProps}
        label="Region/Province/City/Barangay"
        hideLabel
        placeholder="Please Select : Region/Province/City/Barangay"
        regionKey="region"
        provinceKey="province"
        cityKey="cityMunicipality"
        barangayKey="barangay"
        errorRegionKey="region"
        errorProvinceKey="province"
        errorCityKey="cityMunicipality"
        errorBarangayKey="barangay"
      />

      <div className="space-y-2">
        <Label htmlFor="detailedAddress" className="text-sm font-medium text-gray-700">Detailed address (optional)</Label>
        <Textarea
          id="detailedAddress"
          placeholder="Unit No., Building, Street, etc."
          value={formData.detailedAddress}
          onChange={(e) => handleInputChange('detailedAddress', e.target.value)}
          className={`w-full h-20 resize-none ${errors.detailedAddress ? 'border-red-500' : ''}`}
        />
        {errors.detailedAddress && <p className="text-sm text-red-600">{errors.detailedAddress}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">Postal Code</Label>
          <Input
            id="postalCode"
            type="text"
            placeholder="Postal Code"
            value={formData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Phone Number *</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+63 9XXXXXXXXX"
            value={`+63 ${formData.phoneNumber}`}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, '');
              const withoutCode = digitsOnly.startsWith('63') ? digitsOnly.slice(2) : digitsOnly;
              const limited = withoutCode.slice(0, 11);
              handleInputChange('phoneNumber', limited);
            }}
            className={`h-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
            required
          />
          {errors.phoneNumber && <p className="text-sm text-red-600">{errors.phoneNumber}</p>}
        </div>
      </div>


    </div>
  );

  const renderMechanicStep2Educational = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Highest Educational Level *</Label>
        <Select
          value={formData.highestEducationalLevel}
          onValueChange={(value) => handleInputChange('highestEducationalLevel', value)}
        >
          <SelectTrigger className={`h-10 ${validationAttempted && errors.highestEducationalLevel ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select highest educational level" />
          </SelectTrigger>
          <SelectContent>
            {[
              'No formal education',
              'Elementary Level',
              'Elementary Graduate',
              'Highschool Level',
              'Highschool Graduate',
              'College level',
              'College Graduate',
              'Technical-Vocational graduate',
              'Post Graduate',
            ].map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationAttempted && errors.highestEducationalLevel && <p className="text-sm text-red-600">{errors.highestEducationalLevel}</p>}
      </div>

      <div className="space-y-4">
        <div className="space-y-2 w-full md:w-1/3">
          <Label htmlFor="yearGraduatedLastAttended" className="text-sm font-medium text-gray-700 whitespace-nowrap">Year Graduated/Last Attended (Optional)</Label>
          <Input
            id="yearGraduatedLastAttended"
            type="month"
            value={formatMonthYearForInput(formData.yearGraduatedLastAttended)}
            onChange={(e) => {
              handleInputChange('yearGraduatedLastAttended', formatMonthYearForStorage(e.target.value));
            }}
            max={currentMonthInputValue}
            className={`h-10 ${validationAttempted && errors.yearGraduatedLastAttended ? 'border-red-500' : ''}`}
          />
          {validationAttempted && errors.yearGraduatedLastAttended && <p className="text-sm text-red-600">{errors.yearGraduatedLastAttended}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="schoolUniversity" className="text-sm font-medium text-gray-700">School/University *</Label>
          <Input
            id="schoolUniversity"
            type="text"
            placeholder="Enter school/university"
            value={formData.schoolUniversity}
            onChange={(e) => handleInputChange('schoolUniversity', e.target.value)}
            className={`h-10 ${validationAttempted && errors.schoolUniversity ? 'border-red-500' : ''}`}
          />
          {validationAttempted && errors.schoolUniversity && <p className="text-sm text-red-600">{errors.schoolUniversity}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseProgram" className="text-sm font-medium text-gray-700">Course/Program *</Label>
        <Input
          id="courseProgram"
          type="text"
          placeholder="Enter course/program"
          value={formData.courseProgram}
          onChange={(e) => handleInputChange('courseProgram', e.target.value)}
          className={`h-10 ${validationAttempted && errors.courseProgram ? 'border-red-500' : ''}`}
        />
        {validationAttempted && errors.courseProgram && <p className="text-sm text-red-600">{errors.courseProgram}</p>}
      </div>
    </div>
  );

  const BUSINESS_TYPES = ['Sole Proprietorship (Single Owner)', 'Partnership (Multiple Owners)', 'Corporation (Multiple Owners)'];
  const SERVICE_TYPES = ['Home Service', 'Shop Visit', 'Both (Home Service and Shop Visit)'];
  const REPAIR_SERVICE_TYPES = [
    'Automotive Repair',
    'Motorcycle Repair',
    'Appliance Repair',
    'Electronics/ Gadget Repair',
    'Electrical/ Wiring Repair',
    'Transmission',
    'General Maintenance',
  ];
  const DAYS_OF_OPERATION = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const renderShopOwnerStep3LocationFacilities = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          {isIndependentMechanic ? 'Location Address *' : 'Shop Address *'}
        </Label>
        <AddressTabsSelector
          {...addressSelectorCommonProps}
          label="Region/Province/City/Barangay"
          hideLabel
          placeholder="Please Select : Region/Province/City/Barangay"
          regionKey="shopRegion"
          provinceKey="shopProvince"
          cityKey="shopCityMunicipality"
          barangayKey="shopBarangay"
          errorRegionKey="shopRegion"
          errorProvinceKey="shopProvince"
          errorCityKey="shopCityMunicipality"
          errorBarangayKey="shopBarangay"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shopDetailedAddress" className="text-sm font-medium text-gray-700">Detailed address (optional)</Label>
        <Textarea
          id="shopDetailedAddress"
          placeholder="Unit No., Building, Street, etc."
          value={formData.shopDetailedAddress}
          onChange={(e) => handleInputChange('shopDetailedAddress', e.target.value)}
          className={`w-full h-20 resize-none ${validationAttempted && errors.shopDetailedAddress ? 'border-red-500' : ''}`}
        />
        {validationAttempted && errors.shopDetailedAddress && <p className="text-sm text-red-600">{errors.shopDetailedAddress}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="shopLandmark" className="text-sm font-medium text-gray-700">Landmark (optional)</Label>
        <Input
          id="shopLandmark"
          type="text"
          placeholder="e.g., near barangay hall"
          value={formData.shopLandmark}
          onChange={(e) => handleInputChange('shopLandmark', e.target.value)}
          className="h-10"
        />
      </div>
    </div>
  );

  const setOperatingHoursPart = (part, rawValue) => {
    setOperatingHoursParts((current) => {
      let value = rawValue;

      if (part === 'openHH' || part === 'closeHH') {
        value = String(rawValue || '').replace(/\D/g, '').slice(0, 2);
      } else if (part === 'openMM' || part === 'closeMM') {
        value = String(rawValue || '').replace(/\D/g, '').slice(0, 2);
      } else {
        value = rawValue === 'PM' ? 'PM' : 'AM';
      }

      const next = { ...current, [part]: value };
      const complete =
        /^\d{1,2}$/.test(next.openHH) &&
        /^\d{1,2}$/.test(next.openMM) &&
        /^\d{1,2}$/.test(next.closeHH) &&
        /^\d{1,2}$/.test(next.closeMM);

      if (complete) {
        const openHH = String(Math.min(Math.max(Number(next.openHH), 1), 12)).padStart(2, '0');
        const openMM = String(Math.min(Math.max(Number(next.openMM), 0), 59)).padStart(2, '0');
        const closeHH = String(Math.min(Math.max(Number(next.closeHH), 1), 12)).padStart(2, '0');
        const closeMM = String(Math.min(Math.max(Number(next.closeMM), 0), 59)).padStart(2, '0');
        handleInputChange('operatingHours', `${openHH}:${openMM} ${next.openPeriod} - ${closeHH}:${closeMM} ${next.closePeriod}`);
      } else {
        handleInputChange('operatingHours', '');
      }

      return next;
    });
  };

  const renderShopOwnerStep2BusinessInfo = () => (
    <div className="space-y-4">
      {!isIndependentMechanic ? (
        <div className="space-y-2">
          <Label htmlFor="shopName" className="text-sm font-medium text-gray-700">Shop Name *</Label>
          <Input
            id="shopName"
            type="text"
            placeholder="Enter shop name"
            value={formData.shopName}
            onChange={(e) => handleInputChange('shopName', e.target.value)}
            className={`h-10 ${validationAttempted && errors.shopName ? 'border-red-500' : ''}`}
          />
          {validationAttempted && errors.shopName && <p className="text-sm text-red-600">{errors.shopName}</p>}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Type of Business *</Label>
        <Select value={formData.businessType} onValueChange={(v) => handleInputChange('businessType', v)}>
          <SelectTrigger className={`h-10 ${validationAttempted && errors.businessType ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select type of business" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationAttempted && errors.businessType && <p className="text-sm text-red-600">{errors.businessType}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Type of Repair Services Offered (Select All That Apply) *</Label>
        <div className="flex flex-wrap gap-2">
          {REPAIR_SERVICE_TYPES.map((s) => {
            const selected = (formData.repairServicesOffered || []).includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleArrayValue('repairServicesOffered', s)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {validationAttempted && errors.repairServicesOffered && <p className="text-sm text-red-600">{errors.repairServicesOffered}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Service Type *</Label>
        <Select value={formData.serviceType} onValueChange={(v) => handleInputChange('serviceType', v)}>
          <SelectTrigger className={`h-10 ${validationAttempted && errors.serviceType ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            {isIndependentMechanic
              ? INDEPENDENT_SERVICE_TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))
              : SERVICE_TYPES.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
          </SelectContent>
        </Select>
        {validationAttempted && errors.serviceType && <p className="text-sm text-red-600">{errors.serviceType}</p>}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isIndependentMechanic ? '' : 'md:grid-cols-2'}`}>
        <div className="space-y-2">
          <Label htmlFor="yearsOfOperation" className="text-sm font-medium text-gray-700">Years of Operation *</Label>
          <Input
            id="yearsOfOperation"
            type="number"
            inputMode="numeric"
            placeholder="e.g., 5"
            value={formData.yearsOfOperation}
            min="0"
            step="1"
            onChange={(e) => handleInputChange('yearsOfOperation', (e.target.value || '').replace(/\D/g, '').slice(0, 2))}
            className={`h-10 ${validationAttempted && errors.yearsOfOperation ? 'border-red-500' : ''}`}
          />
          {validationAttempted && errors.yearsOfOperation && <p className="text-sm text-red-600">{errors.yearsOfOperation}</p>}
        </div>

        {!isIndependentMechanic ? (
          <div className="space-y-2">
            <Label htmlFor="numberOfEmployees" className="text-sm font-medium text-gray-700">Number of Technicians/Mechanics *</Label>
            <Input
              id="numberOfEmployees"
              type="number"
              inputMode="numeric"
              placeholder="e.g., 3"
              value={formData.numberOfEmployees}
              min="0"
              step="1"
              onChange={(e) => handleInputChange('numberOfEmployees', (e.target.value || '').replace(/\D/g, '').slice(0, 3))}
              className={`h-10 ${validationAttempted && errors.numberOfEmployees ? 'border-red-500' : ''}`}
            />
            {validationAttempted && errors.numberOfEmployees && <p className="text-sm text-red-600">{errors.numberOfEmployees}</p>}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="operatingHoursOpenHH" className="text-sm font-medium text-gray-700">Operating Hours *</Label>
        {(() => {
          const p = operatingHoursParts;
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Opening</p>
                  <div className="flex items-center gap-2">
                    <Input
                      id="operatingHoursOpenHH"
                      type="number"
                      inputMode="numeric"
                      placeholder="HH"
                      min="1"
                      max="12"
                      step="1"
                      value={p.openHH}
                      onChange={(e) => setOperatingHoursPart('openHH', e.target.value)}
                      className={`h-10 w-20 text-center ${validationAttempted && errors.operatingHours ? 'border-red-500' : ''}`}
                    />
                    <span className="text-gray-500">:</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="MM"
                      min="0"
                      max="59"
                      step="1"
                      value={p.openMM}
                      onChange={(e) => setOperatingHoursPart('openMM', e.target.value)}
                      className={`h-10 w-20 text-center ${validationAttempted && errors.operatingHours ? 'border-red-500' : ''}`}
                    />
                    <div className="flex gap-1">
                      {['AM', 'PM'].map((meridiem) => (
                        <button
                          key={`open-${meridiem}`}
                          type="button"
                          onClick={() => setOperatingHoursPart('openPeriod', meridiem)}
                          className={`h-10 px-3 rounded-md border text-sm ${
                            p.openPeriod === meridiem
                              ? 'border-violet-300 bg-violet-50 text-violet-700'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {meridiem}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Closing</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="HH"
                      min="1"
                      max="12"
                      step="1"
                      value={p.closeHH}
                      onChange={(e) => setOperatingHoursPart('closeHH', e.target.value)}
                      className={`h-10 w-20 text-center ${validationAttempted && errors.operatingHours ? 'border-red-500' : ''}`}
                    />
                    <span className="text-gray-500">:</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="MM"
                      min="0"
                      max="59"
                      step="1"
                      value={p.closeMM}
                      onChange={(e) => setOperatingHoursPart('closeMM', e.target.value)}
                      className={`h-10 w-20 text-center ${validationAttempted && errors.operatingHours ? 'border-red-500' : ''}`}
                    />
                    <div className="flex gap-1">
                      {['AM', 'PM'].map((meridiem) => (
                        <button
                          key={`close-${meridiem}`}
                          type="button"
                          onClick={() => setOperatingHoursPart('closePeriod', meridiem)}
                          className={`h-10 px-3 rounded-md border text-sm ${
                            p.closePeriod === meridiem
                              ? 'border-violet-300 bg-violet-50 text-violet-700'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {meridiem}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {validationAttempted && errors.operatingHours && <p className="text-sm text-red-600">{errors.operatingHours}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Days of Operation *</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_OPERATION.map((d) => {
            const selected = (formData.daysOfOperation || []).includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleArrayValue('daysOfOperation', d)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        {validationAttempted && errors.daysOfOperation && <p className="text-sm text-red-600">{errors.daysOfOperation}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="shopDescription" className="text-sm font-medium text-gray-700">Shop Description (optional)</Label>
        <Textarea
          id="shopDescription"
          placeholder="Tell customers about your shop (optional)"
          value={formData.shopDescription}
          onChange={(e) => handleInputChange('shopDescription', e.target.value)}
          className="w-full h-24 resize-none"
        />
      </div>
    </div>
  );

  const renderShopOwnerStep4BusinessRegistration = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dtiSecRegistrationNumber" className="text-sm font-medium text-gray-700">DTI / SEC Registration Number *</Label>
        <Input
          id="dtiSecRegistrationNumber"
          type="text"
          placeholder="Enter DTI/SEC registration number"
          value={formData.dtiSecRegistrationNumber}
          onChange={(e) => handleInputChange('dtiSecRegistrationNumber', e.target.value)}
          className={`h-10 ${validationAttempted && errors.dtiSecRegistrationNumber ? 'border-red-500' : ''}`}
        />
        {validationAttempted && errors.dtiSecRegistrationNumber && <p className="text-sm text-red-600">{errors.dtiSecRegistrationNumber}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessPermitNumber" className="text-sm font-medium text-gray-700">Business Permit Number *</Label>
        <Input
          id="businessPermitNumber"
          type="text"
          placeholder="Enter business permit number"
          value={formData.businessPermitNumber}
          onChange={(e) => handleInputChange('businessPermitNumber', e.target.value)}
          className={`h-10 ${validationAttempted && errors.businessPermitNumber ? 'border-red-500' : ''}`}
        />
        {validationAttempted && errors.businessPermitNumber && <p className="text-sm text-red-600">{errors.businessPermitNumber}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tinNumber" className="text-sm font-medium text-gray-700">TIN (optional)</Label>
        <Input
          id="tinNumber"
          type="text"
          placeholder="Enter TIN (optional)"
          value={formData.tinNumber}
          onChange={(e) => handleInputChange('tinNumber', e.target.value)}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessPermitCertificate" className="text-sm font-medium text-gray-700">Upload Business Permit / Certificate *</Label>
        <Input
          id="businessPermitCertificate"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setFormData(prev => ({ ...prev, businessPermitCertificate: file }));
            if (errors.businessPermitCertificate) setErrors(prev => ({ ...prev, businessPermitCertificate: '' }));
          }}
          className={`h-10 ${validationAttempted && errors.businessPermitCertificate ? 'border-red-500' : ''}`}
        />
        {validationAttempted && errors.businessPermitCertificate && <p className="text-sm text-red-600">{errors.businessPermitCertificate}</p>}
        {formData.businessPermitCertificate && !errors.businessPermitCertificate ? (
          <p className="text-sm text-gray-600">{formData.businessPermitCertificate.name} selected</p>
        ) : null}
      </div>
    </div>
  );

  const renderMechanicStep3WorkExperience = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workCompanyName" className="text-sm font-medium text-gray-700">Name of Office/Company *</Label>
        <Input
          id="workCompanyName"
          type="text"
          placeholder="Enter office/company name"
          value={formData.workCompanyName}
          onChange={(e) => handleInputChange('workCompanyName', e.target.value)}
          className={`h-10 ${validationAttempted && errors.workCompanyName ? 'border-red-500' : ''}`}
        />
        {validationAttempted && errors.workCompanyName && <p className="text-sm text-red-600">{errors.workCompanyName}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Office/Company Address *</Label>
        <AddressTabsSelector
          {...addressSelectorCommonProps}
          label="Region/Province/City/Barangay"
          hideLabel
          placeholder="Please Select : Region/Province/City/Barangay"
          regionKey="workRegion"
          provinceKey="workProvince"
          cityKey="workCityMunicipality"
          barangayKey="workBarangay"
          errorRegionKey="workRegion"
          errorProvinceKey="workProvince"
          errorCityKey="workCityMunicipality"
          errorBarangayKey="workBarangay"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workPositionHeld" className="text-sm font-medium text-gray-700">Position Held *</Label>
          <Input
            id="workPositionHeld"
            type="text"
            placeholder="Enter position held"
            value={formData.workPositionHeld}
            onChange={(e) => handleInputChange('workPositionHeld', e.target.value)}
            className={`h-10 ${validationAttempted && errors.workPositionHeld ? 'border-red-500' : ''}`}
          />
          {validationAttempted && errors.workPositionHeld && <p className="text-sm text-red-600">{errors.workPositionHeld}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workAppointmentStatus" className="text-sm font-medium text-gray-700">Status of Appointment *</Label>
          <Input
            id="workAppointmentStatus"
            type="text"
            placeholder="e.g., Regular, Contractual"
            value={formData.workAppointmentStatus}
            onChange={(e) => handleInputChange('workAppointmentStatus', e.target.value)}
            className={`h-10 ${validationAttempted && errors.workAppointmentStatus ? 'border-red-500' : ''}`}
          />
          {validationAttempted && errors.workAppointmentStatus && <p className="text-sm text-red-600">{errors.workAppointmentStatus}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Inclusive Dates (Month/Year) *</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="workInclusiveFrom" className="text-xs font-medium text-gray-600">Start Date *</Label>
            <Input
              id="workInclusiveFrom"
              type="month"
              value={formatMonthYearForInput(formData.workInclusiveFrom)}
              onChange={(e) => handleInputChange('workInclusiveFrom', formatMonthYearForStorage(e.target.value))}
              onClick={openMonthPicker}
              max={currentMonthInputValue}
              className={`h-10 ${validationAttempted && errors.workInclusiveFrom ? 'border-red-500' : ''}`}
            />
            {validationAttempted && errors.workInclusiveFrom && <p className="text-sm text-red-600">{errors.workInclusiveFrom}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="workInclusiveTo" className="text-xs font-medium text-gray-600">End Date *</Label>
            <Input
              id="workInclusiveTo"
              type="month"
              value={formatMonthYearForInput(formData.workInclusiveTo)}
              onChange={(e) => handleInputChange('workInclusiveTo', formatMonthYearForStorage(e.target.value))}
              onClick={openMonthPicker}
              max={currentMonthInputValue}
              className={`h-10 ${validationAttempted && errors.workInclusiveTo ? 'border-red-500' : ''}`}
            />
            {validationAttempted && errors.workInclusiveTo && <p className="text-sm text-red-600">{errors.workInclusiveTo}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const SKILLS_21ST = [
    'Innovation',
    'Team work',
    'Multi tasking',
    'Work ethics',
    'Self Motivation',
    'Creative Problem Solving',
    'Critical Thinking',
    'Decision Making',
    'Stress Tolerance',
    'Planning and Organizing',
    'Social Perceptiveness',
    'English Functional Skills',
    'English Comprehension',
    'Math Functional Skill',
  ];

  const toggleArrayValue = (field, value, max = null) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(value);
      let next = exists ? current.filter((v) => v !== value) : [...current, value];
      if (!exists && typeof max === 'number' && next.length > max) {
        // ignore add if would exceed max
        next = current;
      }
      return { ...prev, [field]: next };
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const renderMechanicStep4Skills = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Select five (5) Skills you possess (self-assessment) *</Label>
        <div className="flex flex-wrap gap-2">
          {SKILLS_21ST.map((skill) => {
            const selected = (formData.skillsSelfAssessment || []).includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleArrayValue('skillsSelfAssessment', skill, 5)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">Selected: {(formData.skillsSelfAssessment || []).length}/5</p>
        {validationAttempted && errors.skillsSelfAssessment && <p className="text-sm text-red-600">{errors.skillsSelfAssessment}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Technical Skills Acquired Without Formal Training *</Label>
        <div className="flex flex-wrap gap-2">
          {[
            'Troubleshooting',
            'Engine Repair',
            'Maintenance',
            'Welding',
            'Fabrication',
            'Tool Handling',
            'Brake Repair',
            'Wiring',
            'Rewiring',
            'Tire Changing',
            'Alignment',
            'Diagnostics',
            'Improvisation',
            'Motor Repair',
            'Aircon Servicing',
            'Battery Testing',
            'Safety Practices',
          ].map((s) => {
            const selected = (formData.technicalSkillsNoFormalTraining || []).includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleArrayValue('technicalSkillsNoFormalTraining', s)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {validationAttempted && errors.technicalSkillsNoFormalTraining && <p className="text-sm text-red-600">{errors.technicalSkillsNoFormalTraining}</p>}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`h-10 pl-10 ${errors.email ? 'border-red-500' : ''}`}
            required
          />
        </div>
        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password *</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`h-10 pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">At least 8 chars, with upper, lower, and a number</p>
        {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password *</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`h-10 pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="idType" className="text-sm font-medium text-gray-700">ID Type *</Label>
        <Select value={formData.idType} onValueChange={(value) => handleInputChange('idType', value)}>
          <SelectTrigger id="idType" className={`h-10 ${errors.idType ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select ID Type" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: 'passport', label: 'Passport' },
              { value: 'drivers-license', label: "Driver's License" },
              { value: 'national-id', label: 'National ID' },
              { value: 'student-id', label: 'Student ID' },
              { value: 'company-id', label: 'Company ID' },
              { value: 'other', label: 'Other' },
            ].map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.idType && <p className="text-sm text-red-600">{errors.idType}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="validId" className="text-sm font-medium text-gray-700">Valid ID Upload *</Label>
        <div className={`border-2 border-dashed rounded-lg p-0 text-center transition-colors overflow-hidden ${errors.validId ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'}`}>
          <input
            type="file"
            id="validId"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFormData(prev => ({ ...prev, validId: file }));
              if (errors.validId) setErrors(prev => ({ ...prev, validId: '' }));
              if (file.type?.startsWith('image/')) {
                if (validIdPreview) URL.revokeObjectURL(validIdPreview);
                setValidIdPreview(URL.createObjectURL(file));
              } else {
                if (validIdPreview) URL.revokeObjectURL(validIdPreview);
                setValidIdPreview('');
              }
            }}
            className="hidden"
            required
          />
          <label htmlFor="validId" className="cursor-pointer block">
            {validIdPreview ? (
              <img src={validIdPreview} alt="Valid ID Preview" className="w-full h-56 object-cover" />
            ) : (
              <div className="p-6">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload your valid ID (Passport, Driver's License, etc.)
                </p>
                <p className="text-xs text-gray-500">
                  Accepted formats: JPG, PNG, PDF (Max 5MB)
                </p>
              </div>
            )}
          </label>
        </div>
        {errors.validId && <p className="text-sm text-red-600">{errors.validId}</p>}
        {formData.validId && !errors.validId && !validIdPreview && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              {formData.validId.name} selected
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="selfie" className="text-sm font-medium text-gray-700">Selfie with ID (optional)</Label>
        <div className="border-2 border-dashed rounded-lg p-0 text-center transition-colors overflow-hidden border-gray-300 hover:border-blue-400">
          <input
            type="file"
            id="selfie"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFormData(prev => ({ ...prev, selfie: file }));
              if (errors.selfie) setErrors(prev => ({ ...prev, selfie: '' }));
              if (file.type?.startsWith('image/')) {
                if (selfiePreview) URL.revokeObjectURL(selfiePreview);
                setSelfiePreview(URL.createObjectURL(file));
              } else {
                if (selfiePreview) URL.revokeObjectURL(selfiePreview);
                setSelfiePreview('');
              }
            }}
            className="hidden"
          />
          <label htmlFor="selfie" className="cursor-pointer block">
            {selfiePreview ? (
              <img src={selfiePreview} alt="Selfie Preview" className="w-full h-56 object-cover" />
            ) : (
              <div className="p-6">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload a selfie holding your ID (face and ID must be clear)
                </p>
                <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, WEBP (Max 5MB)</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Registration Summary (bottom of Step 4) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Registration Summary</h4>
        {!isExtendedRegistration ? (
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Role:</strong> {formData.role || 'Not selected'}</p>
            <p><strong>Full Name:</strong> {formData.fullName || 'Not provided'}</p>
            <p><strong>Gender:</strong> {formData.gender || 'Not provided'}</p>
            <p><strong>Birthdate:</strong> {formData.birthdate || 'Not provided'}</p>

            <p><strong>Region:</strong> {getRegionName() || 'Not provided'}</p>
            <p><strong>Province:</strong> {getProvinceName() || 'Not provided'}</p>
            <p><strong>City/Municipality:</strong> {getCityName() || 'Not provided'}</p>
            <p><strong>Barangay:</strong> {getBarangayName() || 'Not provided'}</p>
            <p><strong>Detailed Address:</strong> {formData.detailedAddress || 'Not provided'}</p>
            <p><strong>Postal Code:</strong> {formData.postalCode || 'Not provided'}</p>

            <p><strong>Phone:</strong> +63 {formData.phoneNumber || 'Not provided'}</p>
            <p><strong>Email:</strong> {formData.email || 'Not provided'}</p>

            <p><strong>ID Type:</strong> {formData.idType || 'Not selected'}</p>
            <p><strong>Valid ID:</strong> {formData.validId ? formData.validId.name : 'Not uploaded'}</p>

            <div className="pt-2 text-blue-900">
              <p><strong>Formatted Address:</strong> {formatFullAddress() || 'Not provided'}</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-blue-800 space-y-3">
            <div className="space-y-1">
              <p><strong>Role:</strong> {ROLE_OPTIONS.find(r => r.value === formData.role)?.label || formData.role || 'Not selected'}</p>
              {isMechanic ? (
                <p>
                  <strong>Shop:</strong>{' '}
                  {(() => {
                    const o = registeredShopOwners.find((x) => x._id === formData.employedByShopOwnerId);
                    if (!o) return '—';
                    return `${o.shopName} (${o.fullName})`;
                  })()}
                </p>
              ) : null}
              <p><strong>Full Name:</strong> {[formData.lastName, formData.firstName, formData.middleName].filter(Boolean).join(', ') || formData.fullName || 'Not provided'}</p>
              <p><strong>Sex:</strong> {formData.gender || 'Not provided'}</p>
              <p><strong>Birthdate:</strong> {formData.birthdate || 'Not provided'}</p>
              <p><strong>Civil Status:</strong> {formData.civilStatus || 'Not provided'}</p>
            </div>

            <div className="space-y-1 pt-2 border-t border-blue-200">
              <p><strong>Place of Birth:</strong> {formatAddressFrom({
                regionCode: formData.pobRegion,
                provinceCode: formData.pobProvince,
                cityCode: formData.pobCityMunicipality,
                barangayCode: formData.pobBarangay,
              }) || 'Not provided'}</p>
              <p><strong>Present Address:</strong> {formatAddressFrom({
                regionCode: formData.region,
                provinceCode: formData.province,
                cityCode: formData.cityMunicipality,
                barangayCode: formData.barangay,
                detailed: formData.detailedAddress,
                postalCode: formData.postalCode,
              }) || 'Not provided'}</p>
              <p><strong>Permanent Address:</strong> {formatAddressFrom({
                regionCode: formData.permanentRegion,
                provinceCode: formData.permanentProvince,
                cityCode: formData.permanentCityMunicipality,
                barangayCode: formData.permanentBarangay,
              }) || 'Not provided'}</p>
              <p><strong>Mobile Number:</strong> +63 {formData.phoneNumber || 'Not provided'}</p>
              <p><strong>Email Address:</strong> {formData.email || 'Not provided'}</p>
              <p><strong>Employment Status:</strong> {[formData.employmentStatusCategory, formData.employmentStatusDetail].filter(Boolean).join(' - ') || 'Not provided'}</p>
            </div>

            {isMechanic ? (
              <div className="space-y-1 pt-2 border-t border-blue-200">
                <p><strong>Highest Educational Level:</strong> {formData.highestEducationalLevel || 'Not provided'}</p>
                <p><strong>Year Graduated/Last Attended:</strong> {formData.yearGraduatedLastAttended || 'Not provided'}</p>
                <p><strong>School/University:</strong> {formData.schoolUniversity || 'Not provided'}</p>
                <p><strong>Course/Program:</strong> {formData.courseProgram || 'Not provided'}</p>
              </div>
            ) : null}

            {isShopOwnerFlow ? (
              <div className="space-y-1 pt-2 border-t border-blue-200">
                {!isIndependentMechanic ? (
                  <p><strong>Shop Name:</strong> {formData.shopName || 'Not provided'}</p>
                ) : null}
                <p><strong>Type of Business:</strong> {formData.businessType || 'Not provided'}</p>
                <p><strong>Repair Services Offered:</strong> {(formData.repairServicesOffered || []).join(', ') || 'Not provided'}</p>
                <p><strong>Service Type:</strong>{' '}
                  {isIndependentMechanic
                    ? INDEPENDENT_SERVICE_TYPE_OPTIONS.find((o) => o.value === formData.serviceType)?.label ||
                      formData.serviceType ||
                      'Not provided'
                    : formData.serviceType || 'Not provided'}
                </p>
                <p><strong>Years of Operation:</strong> {formData.yearsOfOperation || 'Not provided'}</p>
                {!isIndependentMechanic ? (
                  <p><strong>Number of Employees / Mechanics:</strong> {formData.numberOfEmployees || 'Not provided'}</p>
                ) : null}
                <p><strong>Operating Hours:</strong> {formData.operatingHours || 'Not provided'}</p>
                <p><strong>Days of Operation:</strong> {(formData.daysOfOperation || []).join(', ') || 'Not provided'}</p>
                <p><strong>Shop Description:</strong> {formData.shopDescription || '—'}</p>

                <div className="pt-2 border-t border-blue-200 space-y-1">
                  <p>
                    <strong>{isIndependentMechanic ? 'Location address' : 'Shop Location'}:</strong>{' '}
                    {formatAddressFrom({
                    regionCode: formData.shopRegion,
                    provinceCode: formData.shopProvince,
                    cityCode: formData.shopCityMunicipality,
                    barangayCode: formData.shopBarangay,
                    detailed: formData.shopDetailedAddress,
                  }) || 'Not provided'}
                  </p>
                  <p><strong>Landmark:</strong> {formData.shopLandmark || '—'}</p>
                  {/* removed: available equipment & specialization (per requirement) */}
                </div>

                {isIndependentMechanic ? (
                  <div className="space-y-1 pt-2 border-t border-blue-200">
                    <p><strong>Highest Educational Level:</strong> {formData.highestEducationalLevel || 'Not provided'}</p>
                    <p><strong>Year Graduated/Last Attended:</strong> {formData.yearGraduatedLastAttended || 'Not provided'}</p>
                    <p><strong>School/University:</strong> {formData.schoolUniversity || 'Not provided'}</p>
                    <p><strong>Course/Program:</strong> {formData.courseProgram || 'Not provided'}</p>
                    <p className="pt-2"><strong>21st Century Skills (5):</strong> {(formData.skillsSelfAssessment || []).join(', ') || 'Not provided'}</p>
                    <p><strong>Technical Skills (No Formal Training):</strong> {(formData.technicalSkillsNoFormalTraining || []).join(', ') || 'Not provided'}</p>
                  </div>
                ) : null}

                {!isIndependentMechanic ? (
                  <div className="pt-2 border-t border-blue-200 space-y-1">
                    <p><strong>DTI/SEC Registration No.:</strong> {formData.dtiSecRegistrationNumber || 'Not provided'}</p>
                    <p><strong>Business Permit No.:</strong> {formData.businessPermitNumber || 'Not provided'}</p>
                    <p><strong>TIN:</strong> {formData.tinNumber || '—'}</p>
                    <p><strong>Business Permit/Certificate:</strong> {formData.businessPermitCertificate ? formData.businessPermitCertificate.name : 'Not uploaded'}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isMechanic ? (
              <>
                <div className="space-y-1 pt-2 border-t border-blue-200">
                  <p><strong>Office/Company:</strong> {formData.workCompanyName || 'Not provided'}</p>
                  <p><strong>Company Address:</strong> {formatAddressFrom({
                    regionCode: formData.workRegion,
                    provinceCode: formData.workProvince,
                    cityCode: formData.workCityMunicipality,
                    barangayCode: formData.workBarangay,
                  }) || formData.workCompanyAddress || 'Not provided'}</p>
                  <p><strong>Position Held:</strong> {formData.workPositionHeld || 'Not provided'}</p>
                  <p><strong>Inclusive Dates:</strong> {[formData.workInclusiveFrom, formData.workInclusiveTo].filter(Boolean).join(' to ') || 'Not provided'}</p>
                  <p><strong>Status of Appointment:</strong> {formData.workAppointmentStatus || 'Not provided'}</p>
                </div>

                <div className="space-y-1 pt-2 border-t border-blue-200">
                  <p><strong>21st Century Skills (5):</strong> {(formData.skillsSelfAssessment || []).join(', ') || 'Not provided'}</p>
                  <p><strong>Technical Skills (No Formal Training):</strong> {(formData.technicalSkillsNoFormalTraining || []).join(', ') || 'Not provided'}</p>
                </div>
              </>
            ) : null}

            <div className="space-y-1 pt-2 border-t border-blue-200 text-blue-900">
              <p><strong>ID Type:</strong> {formData.idType || 'Not selected'}</p>
              <p><strong>Valid ID:</strong> {formData.validId ? formData.validId.name : 'Not uploaded'}</p>
              <p><strong>Selfie with ID:</strong> {formData.selfie ? formData.selfie.name : 'Not uploaded'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      if (validIdPreview) URL.revokeObjectURL(validIdPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [validIdPreview, selfiePreview]);

  // Viewport uses overflow-hidden; scroll lives inside CardContent. Snap to top on step / role view change.
  useLayoutEffect(() => {
    registrationContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentStep, isRoleSelected, mechanicShopGateOpen]);

  return (
    <div
      className="relative flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden p-4"
      style={{ backgroundImage: gradientNavyBlue, color: '#ffffff' }}
    >
      <style>{`
        @keyframes epaayosSlowGradientMove {
          0% { background-position: 0% 0%, 0% 50%; transform: translate3d(0, 0, 0) scale(1.02); }
          50% { background-position: 0% 0%, 100% 50%; transform: translate3d(-1.2%, 0.8%, 0) scale(1.04); }
          100% { background-position: 0% 0%, 0% 50%; transform: translate3d(0, 0, 0) scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          .epaayos-animated-bg { animation: none !important; transform: none !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 epaayos-animated-bg"
        style={{
          backgroundImage: `${gradientHeroMesh},
            radial-gradient(ellipse 70% 60% at 50% 40%, rgba(255, 255, 255, 0.10) 0%, transparent 55%),
            linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.14) 50%, transparent 60%)`,
          backgroundSize: 'auto, 140% 140%, 240% 240%',
          animation: 'epaayosSlowGradientMove 32s ease-in-out infinite',
          opacity: 0.92,
          filter: 'saturate(1.05) brightness(1.08)',
          willChange: 'background-position, transform'
        }}
      />
      <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className={`flex max-h-full w-full min-h-0 flex-col ${
            !isRoleSelected && !mechanicShopGateOpen ? 'max-w-4xl' : 'max-w-2xl'
          }`}
        >
        <Card
          className="flex max-h-full min-h-0 w-full flex-1 flex-col border shadow-2xl"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.22)',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(10px)',
            boxShadow:
              '0 28px 70px rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.75)'
          }}
        >
          <CardHeader className="shrink-0 text-center">
            <div className="flex justify-start">
              <button
                type="button"
                className="inline-flex items-center hover:opacity-80"
                style={{ color: navy }}
                onClick={() => { window.location.hash = '#/' }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </button>
            </div>
            <img
              src={logoEpaayos}
              alt="E-PAAYOS"
              className="mx-auto mb-2 h-12 w-auto max-w-[200px] object-contain"
              decoding="async"
            />
            <CardTitle className="text-2xl" style={{ color: navy }}>
              {isRoleSelected
                ? 'Create your account'
                : mechanicShopGateOpen
                  ? 'Select shop and shop owner'
                  : 'Choose your role'}
            </CardTitle>
            <CardDescription style={{ color: textBodyOnLight }}>
              {isRoleSelected
                ? 'Fill in the details to register'
                : mechanicShopGateOpen
                  ? 'Pick the shop you work for and its registered owner, then tap Confirm to open the registration form.'
                  : 'Select one role to continue registration'}
            </CardDescription>

            {/* Progress Steps */}
            {isRoleSelected && (
              <>
                <div className="flex justify-center mt-6">
                  <div className="flex items-center space-x-4">
                    {activeSteps.map((step, index) => (
                      <div key={step.number} className="flex items-center">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            currentStep >= step.number
                              ? 'text-white'
                              : 'border-gray-300 text-gray-500'
                          }`}
                          style={currentStep >= step.number ? { backgroundImage: gradientNavyButton, borderColor: 'transparent' } : {}}
                        >
                          {step.number}
                        </div>
                        {index < activeSteps.length - 1 && (
                          <div
                            className="w-12 h-0.5 mx-2 rounded-full"
                            style={{ backgroundColor: currentStep > step.number ? bvSoft : '#e5e7eb' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-sm mt-2" style={{ color: textBodyOnLight }}>
                  Step {currentStep} of {activeSteps.length}: {activeSteps[currentStep - 1]?.title}
                </p>
              </>
            )}
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
            <div
              ref={registrationContentRef}
              className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-0"
            >
              {errors.general && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              )}

              {!isRoleSelected ? (
                mechanicShopGateOpen ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4">
                      <div className="flex items-start gap-2">
                        <Wrench className="h-5 w-5 shrink-0 mt-0.5" style={{ color: navy }} aria-hidden />
                        <p className="text-sm" style={{ color: textBodyOnLight }}>
                          <span className="font-semibold" style={{ color: navy }}>Mechanic / Technician</span>
                          {' — '}Choose the shop you are joining. Each row lists the shop name and the registered shop owner.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mechanicShopSearch" className="text-sm font-medium text-gray-700">Search shops or owners</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
                        <Input
                          id="mechanicShopSearch"
                          className="h-10 pl-10"
                          placeholder="Type shop name or owner name"
                          value={shopOwnerListSearch}
                          onChange={(e) => setShopOwnerListSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    {loadingShopOwners && <p className="text-sm text-gray-600">Loading registered shops...</p>}
                    {shopOwnersLoadError && <p className="text-sm text-red-600">{shopOwnersLoadError}</p>}
                    {!loadingShopOwners && !shopOwnersLoadError && registeredShopOwners.length === 0 && (
                      <p className="text-sm text-gray-600">No registered shops yet. A shop owner must create an account before mechanics can register under a shop.</p>
                    )}
                    <div className="space-y-2 max-h-[min(320px,45vh)] overflow-y-auto pr-1">
                      {registeredShopOwners
                        .filter((o) => {
                          const q = shopOwnerListSearch.trim().toLowerCase();
                          if (!q) return true;
                          const hay = `${o.shopName || ''} ${o.fullName || ''} ${o.shopDetailedAddress || ''} ${o.shopLandmark || ''}`.toLowerCase();
                          return hay.includes(q);
                        })
                        .map((owner) => {
                          const selected = formData.employedByShopOwnerId === owner._id;
                          return (
                            <button
                              key={owner._id}
                              type="button"
                              onClick={() => handleInputChange('employedByShopOwnerId', owner._id)}
                              className={[
                                'w-full text-left rounded-xl border-2 p-3 transition-all duration-200',
                                selected
                                  ? 'text-white shadow-lg ring-2 ring-offset-2 ring-[rgba(8,31,92,0.4)] hover:brightness-110'
                                  : [
                                      'bg-white text-gray-900 border-[rgba(8,31,92,0.14)]',
                                      'hover:border-[rgba(8,31,92,0.4)] hover:shadow-md',
                                      'hover:bg-gradient-to-br hover:from-[rgba(8,31,92,0.06)] hover:via-[rgba(11,43,115,0.08)] hover:to-[rgba(20,71,166,0.14)]',
                                    ].join(' '),
                              ].join(' ')}
                              style={
                                selected
                                  ? {
                                      backgroundImage: gradientNavyButton,
                                      borderColor: 'transparent',
                                      boxShadow: '0 8px 24px rgba(8, 31, 92, 0.35)',
                                    }
                                  : undefined
                              }
                            >
                              <div className={`font-semibold ${selected ? 'text-white' : 'text-gray-900'}`}>{owner.shopName || 'Shop'}</div>
                              <div className={`text-sm ${selected ? 'text-white/90' : 'text-gray-600'}`}>Shop owner: {owner.fullName}</div>
                              {(owner.shopDetailedAddress || owner.shopLandmark) && (
                                <div className={`text-xs mt-1 ${selected ? 'text-white/75' : 'text-gray-500'}`}>
                                  {[owner.shopDetailedAddress, owner.shopLandmark].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>
                    {validationAttempted && errors.employedByShopOwnerId && (
                      <p className="text-sm text-red-600">{errors.employedByShopOwnerId}</p>
                    )}
                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto bg-white"
                        style={{ borderColor: borderNavySoft, color: navy }}
                        onClick={cancelMechanicShopGate}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="w-full sm:w-auto border-0 shadow-md hover:brightness-110"
                        style={{ backgroundImage: gradientNavyButton, color: '#ffffff' }}
                        onClick={confirmMechanicShopGate}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] sm:overflow-visible">
                      <div
                        className="grid w-full gap-3 sm:gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${ROLE_OPTIONS.length}, minmax(0, 1fr))`,
                        }}
                      >
                      {ROLE_OPTIONS.map((role) => {
                        const active = formData.role === role.value;
                        const RoleIcon = role.Icon;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => selectRole(role.value)}
                            className={[
                              'group flex min-h-full min-w-[148px] flex-col items-center gap-2 overflow-hidden rounded-2xl border-0 p-3.5 text-center ring-0 sm:min-w-0 sm:gap-4 sm:p-5',
                              'cursor-pointer bg-white/95 shadow-[0_3px_10px_rgba(15,23,42,0.12)]',
                              'transition-all duration-200 ease-out',
                              'hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-slate-50/95 hover:shadow-[0_12px_24px_rgba(15,23,42,0.18)]',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#081F5C]/40',
                              active
                                ? '-translate-y-0.5 scale-[1.01] bg-slate-50/95 shadow-[0_12px_24px_rgba(15,23,42,0.2)]'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <div
                              className={[
                                'flex h-19 w-19 shrink-0 items-center justify-center rounded-2xl',
                                'shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-200 ease-out',
                                'group-hover:scale-110 group-hover:shadow-[0_6px_16px_rgba(15,23,42,0.14)]',
                                active ? 'shadow-[0_4px_14px_rgba(15,23,42,0.14)]' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              style={{
                                background: active ? role.iconBgActive : role.iconBgIdle,
                                color: role.iconColor,
                              }}
                              aria-hidden
                            >
                              <RoleIcon className="h-11 w-11" strokeWidth={active ? 2.25 : 2} />
                            </div>
                            <div className="font-semibold leading-tight" style={{ color: navy }}>
                              {role.label}
                            </div>
                            <div className="text-xs leading-snug sm:text-sm" style={{ color: textBodyOnLight }}>
                              {role.description}
                            </div>
                          </button>
                        );
                      })}
                      </div>
                    </div>

                    {validationAttempted && errors.role && <p className="text-sm text-red-600">{errors.role}</p>}
                  </div>
                )
              ) : (
                <>
                  {currentStep === 1 && renderStep1()}
                  {!isExtendedRegistration && currentStep === 2 && renderStep2()}
                  {isMechanic && currentStep === 2 && renderMechanicStep2Educational()}
                  {isShopOwnerFlow && currentStep === 2 && renderShopOwnerStep2BusinessInfo()}
                  {isMechanic && currentStep === 3 && renderMechanicStep3WorkExperience()}
                  {isShopOwnerFlow && currentStep === 3 && renderShopOwnerStep3LocationFacilities()}
                  {isMechanic && currentStep === 4 && renderMechanicStep4Skills()}
                  {isIndependentMechanic && currentStep === 4 && renderMechanicStep2Educational()}
                  {isIndependentMechanic && currentStep === 4 && renderMechanicStep4Skills()}
                  {isShopOwnerFlow && currentStep === 4 && !isIndependentMechanic && renderShopOwnerStep4BusinessRegistration()}
                  {(!isExtendedRegistration && currentStep === 3) && renderStep3()}
                  {(!isExtendedRegistration && currentStep === 4) && renderStep4()}
                  {(isExtendedRegistration && currentStep === 5) && renderStep3()}
                  {(isExtendedRegistration && currentStep === 6) && renderStep4()}

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="flex items-center bg-white"
                      style={{ borderColor: borderNavySoft, color: navy }}
                    >
                      <ArrowLeftCircle className="mr-2 h-4 w-4" />
                      Previous
                    </Button>

                    {currentStep < activeSteps.length ? (
                      <Button
                        onClick={nextStep}
                        className="flex items-center border-0 shadow-md hover:brightness-110 hover:shadow-lg"
                        style={{ backgroundImage: gradientNavyButton, color: '#ffffff' }}
                      >
                        Next
                        <ArrowRightCircle className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        className="border-0 shadow-md hover:brightness-110 hover:shadow-lg"
                        style={{ backgroundImage: gradientNavyButton, color: '#ffffff' }}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    )}
                  </div>
                </>
              )}

              <div className="border-t pt-4 text-center text-sm" style={{ color: textBodyOnLight, borderColor: borderNavySoft }}>
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-medium hover:opacity-80"
                  style={{ color: navy }}
                  onClick={() => { window.location.hash = '#/login'; }}
                >
                  Sign in
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <Dialog open={registrationSuccessOpen} onOpenChange={setRegistrationSuccessOpen}>
        <DialogContent className="border-[#081F5C]/15 sm:max-w-md dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-[#081F5C] dark:text-gray-100">Registration submitted</DialogTitle>
            <DialogDescription className="text-left text-sm text-gray-600 dark:text-gray-400">
              Please wait a few minutes for an administrator to approve your account. You can sign in only after your account has been approved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              className="border-0 shadow-md hover:brightness-110"
              style={{ backgroundImage: gradientNavyButton, color: '#ffffff' }}
              onClick={() => {
                setRegistrationSuccessOpen(false);
                window.location.hash = '#/login';
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;

