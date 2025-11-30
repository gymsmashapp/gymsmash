import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Edit2, Dumbbell, ListChecks, RefreshCw, Video, ExternalLink, XCircle, Download, Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Added DialogTrigger here
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const targetZoneOptions = [
  { value: "arms", label: "Arms" },
  { value: "chest", label: "Chest" },
  { value: "abs", label: "Abs" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
];

export default function AdminWorkoutsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  
  // Template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    description: "",
    target_goal: "build_muscle",
    target_zones: [],
    equipment_needed: "full_gym",
    fitness_level: "intermediate",
    duration_minutes: 45,
    muscle_group: "",
    exercises: [],
    is_active: true,
    template_group: "",
    version_number: 1,
  });
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState([]);

  // State for template deactivation
  const [deactivatingTemplate, setDeactivatingTemplate] = useState(null);
  const [deactivateConfirmDialogOpen, setDeactivateConfirmDialogOpen] = useState(false);

  // Exercise state
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseLibrarySearch, setExerciseLibrarySearch] = useState("");
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [isUploadingExerciseVideo, setIsUploadingExerciseVideo] = useState(false);
  const [isUploadingCoachVideo, setIsUploadingCoachVideo] = useState(null); // index of coach video being uploaded
  const [exerciseFormData, setExerciseFormData] = useState({
    name: "",
    exercise_code: "",
    description: "",
    target_goal: [],
    equipment_needed: [],
    experience_level: [],
    target_zones: [],
    stats_to_display: ["weight", "volume", "time_under_tension"],
    default_sets: 3,
    default_reps: "10-12",
    default_rest_seconds: 60,
    video_url: "",
    coach_videos: [],
    is_unilateral: false,
  });
  const [selectedZoneFilter, setSelectedZoneFilter] = useState("all");
  const [selectedGoalFilter, setSelectedGoalFilter] = useState("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const [isMigrating, setIsMigrating] = useState(false);

  // Global rotation settings
  const [rotationWeeks, setRotationWeeks] = useState(4);
  const [savingRotation, setSavingRotation] = useState(false);
  
  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper function to get YouTube embed URL with better Shorts support
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    const cleanUrl = url.trim();
    
    if (cleanUrl.includes('youtube.com/embed/')) return cleanUrl;

    let videoId = null;
    
    const shortsMatch = cleanUrl.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }
    
    if (!videoId) {
      const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (watchMatch) {
        videoId = watchMatch[1];
      }
    }
    
    if (!videoId) {
      const shortLinkMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (shortLinkMatch) {
        videoId = shortLinkMatch[1];
      }
    }
    
    if (!videoId) {
      const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) {
        videoId = embedMatch[1];
      }
    }

    if (videoId && videoId.length === 11) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return null;
  };

  const getYouTubeVideoId = (url) => {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (!embedUrl) return null;
    const match = embedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  // Queries
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: () => base44.entities.WorkoutTemplate.list('-created_date', 100),
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list('name', 500),
  });

  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => base44.entities.Coach.filter({ is_active: true }, 'name'),
  });

  const { data: rotationSetting } = useQuery({
    queryKey: ['rotation-setting'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.filter({
        setting_key: 'template_rotation_weeks'
      });
      if (settings.length > 0) {
        setRotationWeeks(parseInt(settings[0].setting_value) || 4);
        return settings[0];
      }
      return null;
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkoutTemplate.create({
      ...data,
      created_by_type: "gym_smash",
      creator_name: "Gym Smash",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      resetTemplateForm();
      setTemplateDialogOpen(false);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkoutTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      resetTemplateForm();
      setTemplateDialogOpen(false);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkoutTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });

  const deactivateTemplateMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.WorkoutTemplate.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      setDeactivatingTemplate(null);
      setDeactivateConfirmDialogOpen(false);
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = '✅ Template deactivated successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
    onError: (error) => {
      console.error("Error deactivating template:", error);
      alert("Failed to deactivate template: " + error.message);
      setDeactivatingTemplate(null);
      setDeactivateConfirmDialogOpen(false);
    }
  });

  // Exercise mutations
  const createExerciseMutation = useMutation({
    mutationFn: (data) => base44.entities.Exercise.create({
      ...data,
      created_by_type: "gym_smash",
      creator_name: "Gym Smash",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      resetExerciseForm();
      setExerciseDialogOpen(false);
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data, exerciseName }) => {
      console.log('🚀 Frontend: Calling updateExercise function...');
      console.log('📝 Exercise ID:', id);
      console.log('📝 Original Name:', exerciseName);
      console.log('📹 Video URL:', data.video_url);
      
      // Call backend function with service role to sync everywhere
      const response = await base44.functions.invoke('updateExercise', {
        exerciseId: id,
        exerciseData: data,
        originalName: exerciseName
      });
      
      console.log('✅ Backend response:', response.data);
      return response.data;
    },
    onSuccess: (result) => {
      console.log('✅ Update mutation succeeded:', result);
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      // Invalidate all current-workout queries with any parameters
      queryClient.invalidateQueries({ queryKey: ['current-workout'], exact: false });
      resetExerciseForm();
      setExerciseDialogOpen(false);
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = `✅ Exercise synced to ${result.templatesUpdated} templates & ${result.schedulesUpdated} active schedules!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    },
    onError: (error) => {
      console.error("❌ Error updating exercise:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
      alert("Error updating exercise: " + (error.response?.data?.error || error.message));
    }
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id) => base44.entities.Exercise.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const handleMigrateExercises = async () => {
    if (!templates || !exercises) return;
    
    setIsMigrating(true);
    try {
      const existingExerciseNames = new Set(exercises.map(e => e.name.toLowerCase().trim()));
      const exercisesToCreate = [];
      
      templates.forEach(template => {
        if (template.exercises && Array.isArray(template.exercises)) {
          template.exercises.forEach(ex => {
            const exerciseName = ex.name.toLowerCase().trim();
            
            if (!existingExerciseNames.has(exerciseName) && 
                !exercisesToCreate.find(e => e.name.toLowerCase().trim() === exerciseName)) {
              
              exercisesToCreate.push({
                name: ex.name,
                description: ex.notes || "",
                target_goal: template.target_goal || "build_muscle",
                equipment_needed: template.equipment_needed || "full_gym",
                default_sets: ex.sets || 3,
                default_reps: ex.reps || "10-12",
                default_rest_seconds: ex.rest_seconds || 60,
                video_url: ex.video_url || "",
                coach_videos: [], // Default to empty for migrated exercises
                is_unilateral: ex.is_unilateral || false,
              });
            }
          });
        }
      });
      
      if (exercisesToCreate.length === 0) {
        alert("No new exercises to import. All exercises from templates are already in the library!");
        setIsMigrating(false);
        return;
      }
      
      await base44.entities.Exercise.bulkCreate(exercisesToCreate);
      
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      
      alert(`Successfully imported ${exercisesToCreate.length} exercise${exercisesToCreate.length !== 1 ? 's' : ''} from templates!`);
    } catch (error) {
      console.error("Error migrating exercises:", error);
      alert("Error importing exercises: " + error.message);
    }
    setIsMigrating(false);
  };

  const handleSaveRotationWeeks = async () => {
    setSavingRotation(true);
    try {
      if (rotationSetting) {
        await base44.entities.AppSettings.update(rotationSetting.id, {
          setting_value: rotationWeeks.toString()
        });
      } else {
        await base44.entities.AppSettings.create({
          setting_key: 'template_rotation_weeks',
          setting_value: rotationWeeks.toString(),
          description: 'Number of weeks before rotating to next template version'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['rotation-setting'] });
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Rotation settings saved!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error("Error saving rotation:", error);
      alert("Error saving rotation settings: " + error.message);
    }
    setSavingRotation(false);
  };

  const handleFullSync = async () => {
    if (!confirm('This will sync all exercise data (including coach videos) to ALL user schedules. Continue?')) {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('syncExercisesToSchedules');
      console.log('Sync response:', response.data);
      
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['current-workout'], exact: false });
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = `✅ ${response.data.message}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed: ' + error.message);
    }
    setIsSyncing(false);
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: "",
      description: "",
      target_goal: "build_muscle",
      target_zones: [],
      equipment_needed: "full_gym",
      fitness_level: "intermediate",
      duration_minutes: 45,
      muscle_group: "",
      exercises: [],
      is_active: true,
      template_group: "",
      version_number: 1,
    });
    setEditingTemplate(null);
    setSelectedExercises([]);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateFormData({ 
      ...template, 
      is_active: template.is_active ?? true,
      template_group: template.template_group || "",
      version_number: template.version_number || 1,
      muscle_group: template.muscle_group || "",
      target_zones: template.target_zones || [],
      fitness_level: template.fitness_level || "intermediate",
    });
    setTemplateDialogOpen(true);
  };

  const handleAddExercisesToTemplate = () => {
    const exercisesToAdd = selectedExercises.map(ex => ({
      name: ex.name,
      exercise_code: ex.exercise_code || ex.id, // Use exercise_code if set, otherwise use the entity ID
      sets: ex.default_sets,
      reps: ex.default_reps,
      rest_seconds: ex.default_rest_seconds,
      notes: ex.description || "",
      video_url: ex.video_url || "",
      coach_videos: ex.coach_videos || [],
      is_unilateral: ex.is_unilateral || false,
    }));

    setTemplateFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, ...exercisesToAdd]
    }));
    setSelectedExercises([]);
    setShowExercisePicker(false);
  };

  const handleRemoveExerciseFromTemplate = (index) => {
    setTemplateFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitTemplate = () => {
    if (!templateFormData.name || templateFormData.target_zones.length === 0 || templateFormData.exercises.length === 0) {
      alert("Please fill in name, select at least one target zone, and add at least one exercise");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  const handleDeactivateClick = (template) => {
    setDeactivatingTemplate(template);
    setDeactivateConfirmDialogOpen(true);
  };

  const confirmDeactivateTemplate = () => {
    if (!deactivatingTemplate || !templates) return;

    if (deactivatingTemplate.template_group) {
      const activeTemplatesInGroup = templates.filter(t =>
        t.template_group === deactivatingTemplate.template_group &&
        t.is_active &&
        t.id !== deactivatingTemplate.id
      );
      if (activeTemplatesInGroup.length === 0) {
        alert(`Cannot deactivate "${deactivatingTemplate.name}". At least one template in the group "${deactivatingTemplate.template_group}" must remain active for rotation.`);
        setDeactivatingTemplate(null);
        setDeactivateConfirmDialogOpen(false);
        return;
      }
    }
    deactivateTemplateMutation.mutate({ id: deactivatingTemplate.id });
  };

  const getFilteredExercisesForTemplate = () => {
    if (!exercises) return [];
    
    return exercises.filter(ex => ex.target_goal).filter(ex => {
      const goalMatch = ex.target_goal === templateFormData.target_goal;
      const equipmentMatch = templateFormData.equipment_needed === 'full_gym' 
        ? ex.equipment_needed === 'full_gym' || ex.equipment_needed === 'both'
        : ex.equipment_needed === 'bodyweight_only' || ex.equipment_needed === 'both';
      
      // Match fitness level if template has one set
      const levelMatch = !templateFormData.fitness_level || 
        ex.fitness_level === templateFormData.fitness_level ||
        ex.fitness_level === 'all';
      
      return goalMatch && equipmentMatch && levelMatch;
    });
  };

  const resetExerciseForm = () => {
    setExerciseFormData({
      name: "",
      exercise_code: "",
      description: "",
      target_goal: [],
      equipment_needed: [],
      experience_level: [],
      target_zones: [],
      stats_to_display: ["weight", "volume", "time_under_tension"],
      default_sets: 3,
      default_reps: "10-12",
      default_rest_seconds: 60,
      video_url: "",
      coach_videos: [],
      is_unilateral: false,
    });
    setEditingExercise(null);
  };

  const handleEditExercise = (exercise) => {
    setEditingExercise(exercise);
    setExerciseFormData({
      name: exercise.name || "",
      exercise_code: exercise.exercise_code || "",
      description: exercise.description || "",
      target_goal: Array.isArray(exercise.target_goal) ? exercise.target_goal : (exercise.target_goal ? [exercise.target_goal] : []),
      equipment_needed: Array.isArray(exercise.equipment_needed) ? exercise.equipment_needed : (exercise.equipment_needed ? [exercise.equipment_needed] : []),
      experience_level: Array.isArray(exercise.experience_level) ? exercise.experience_level : (exercise.experience_level || exercise.fitness_level ? [exercise.experience_level || exercise.fitness_level] : []),
      target_zones: exercise.target_zones || [],
      stats_to_display: exercise.stats_to_display || ["weight", "volume", "time_under_tension"],
      default_sets: exercise.default_sets || 3,
      default_reps: exercise.default_reps || "10-12",
      default_rest_seconds: exercise.default_rest_seconds || 60,
      video_url: exercise.video_url || "",
      coach_videos: exercise.coach_videos || [],
      is_unilateral: exercise.is_unilateral || false,
    });
    setExerciseDialogOpen(true);
  };

  const exportExercises = () => {
    if (!exercises || exercises.length === 0) {
      alert('No exercises to export');
      return;
    }

    // Define headers
    const headers = [
      'Name',
      'Exercise Code',
      'Description',
      'Target Goals',
      'Equipment Needed',
      'Experience Level',
      'Target Zones',
      'Stats to Display',
      'Default Sets',
      'Default Reps',
      'Default Rest (seconds)',
      'Video URL',
      'Is Unilateral'
    ];

    // Convert exercises to rows
    const rows = exercises.map(ex => [
      ex.name || '',
      ex.exercise_code || '',
      ex.description || '',
      Array.isArray(ex.target_goal) ? ex.target_goal.join('; ') : (ex.target_goal || ''),
      Array.isArray(ex.equipment_needed) ? ex.equipment_needed.join('; ') : (ex.equipment_needed || ''),
      Array.isArray(ex.experience_level) ? ex.experience_level.join('; ') : (ex.experience_level || ''),
      Array.isArray(ex.target_zones) ? ex.target_zones.join('; ') : '',
      Array.isArray(ex.stats_to_display) ? ex.stats_to_display.join('; ') : '',
      ex.default_sets || 4,
      ex.default_reps || '10',
      ex.default_rest_seconds || 45,
      ex.video_url || '',
      ex.is_unilateral ? 'Yes' : 'No'
    ]);

    // Build Excel XML format (compatible with Excel)
    let excelContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    excelContent += '<?mso-application progid="Excel.Sheet"?>\n';
    excelContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    excelContent += '<Worksheet ss:Name="Exercises">\n<Table>\n';
    
    // Add header row
    excelContent += '<Row>\n';
    headers.forEach(header => {
      excelContent += `<Cell><Data ss:Type="String">${header}</Data></Cell>\n`;
    });
    excelContent += '</Row>\n';
    
    // Add data rows
    rows.forEach(row => {
      excelContent += '<Row>\n';
      row.forEach((cell, index) => {
        const cellValue = String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const type = (index === 8 || index === 10) ? 'Number' : 'String';
        excelContent += `<Cell><Data ss:Type="${type}">${cellValue}</Data></Cell>\n`;
      });
      excelContent += '</Row>\n';
    });
    
    excelContent += '</Table>\n</Worksheet>\n</Workbook>';

    const dataBlob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gym-smash-exercises-${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importExercises = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedExercises = JSON.parse(text);
      
      if (!Array.isArray(importedExercises)) {
        alert('Invalid file format. Expected an array of exercises.');
        return;
      }

      const confirmed = confirm(
        `Import ${importedExercises.length} exercises?\n\n` +
        `This will:\n` +
        `- Create new exercises that don't exist\n` +
        `- Update existing exercises (matched by name)\n\n` +
        `Continue?`
      );

      if (!confirmed) return;

      let created = 0;
      let updated = 0;

      for (const exercise of importedExercises) {
        // Remove id and system fields
        const { id, created_date, updated_date, created_by, ...exerciseData } = exercise;

        // Ensure required fields
        if (!exerciseData.name || !exerciseData.target_goal || !exerciseData.equipment_needed || !exerciseData.target_zones) {
          console.warn(`Skipping invalid exercise:`, exerciseData.name);
          continue;
        }

        // Check if exercise exists
        const existing = exercises?.find(e => e.name === exerciseData.name);

        if (existing) {
          // Update existing
          await updateExerciseMutation.mutateAsync({ 
            id: existing.id, 
            data: exerciseData 
          });
          updated++;
        } else {
          // Create new
          await createExerciseMutation.mutateAsync(exerciseData);
          created++;
        }
      }

      alert(
        `Import completed!\n\n` +
        `✅ Created: ${created}\n` +
        `🔄 Updated: ${updated}\n` +
        `Total: ${created + updated}`
      );

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message}`);
      event.target.value = '';
    }
  };

  const handleAddCoachVideo = () => {
    setExerciseFormData(prev => ({
      ...prev,
      coach_videos: [...prev.coach_videos, { coach_id: "", coach_name: "", video_url: "" }]
    }));
  };

  const handleRemoveCoachVideo = (index) => {
    setExerciseFormData(prev => ({
      ...prev,
      coach_videos: prev.coach_videos.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateCoachVideo = (index, field, value) => {
    setExerciseFormData(prev => {
      const newCoachVideos = [...prev.coach_videos];
      newCoachVideos[index] = { ...newCoachVideos[index], [field]: value };
      
      // Auto-fill coach_name when coach_id is selected
      if (field === 'coach_id' && coaches) {
        const selectedCoach = coaches.find(c => c.id === value);
        if (selectedCoach) {
          newCoachVideos[index].coach_name = selectedCoach.name;
        }
      }
      
      return { ...prev, coach_videos: newCoachVideos };
    });
  };

  const handleExerciseVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('Video must be under 100MB');
      return;
    }

    setIsUploadingExerciseVideo(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (result?.file_url) {
        setExerciseFormData(prev => ({ ...prev, video_url: result.file_url }));
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = '✅ Video uploaded!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video');
    }
    setIsUploadingExerciseVideo(false);
  };

  const handleCoachVideoUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('Video must be under 100MB');
      return;
    }

    setIsUploadingCoachVideo(index);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (result?.file_url) {
        handleUpdateCoachVideo(index, 'video_url', result.file_url);
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = '✅ Coach video uploaded!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video');
    }
    setIsUploadingCoachVideo(null);
  };

  const handleSubmitExercise = () => {
    if (!exerciseFormData.name || exerciseFormData.target_zones.length === 0 || exerciseFormData.target_goal.length === 0 || exerciseFormData.experience_level.length === 0) {
      alert("Please fill in name, select at least one target zone, at least one fitness goal, and at least one experience level");
      return;
    }

    if (editingExercise) {
      updateExerciseMutation.mutate({ 
        id: editingExercise.id, 
        data: exerciseFormData,
        exerciseName: editingExercise.name
      });
    } else {
      createExerciseMutation.mutate(exerciseFormData);
    }
  };

  if (templatesLoading || exercisesLoading || coachesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  const goalOrder = ["tone_body", "build_muscle"];
  const goalLabels = {
    tone_body: "Tone Body",
    build_muscle: "Build Muscle"
  };

  const templatesByGoalAndGroup = templates?.reduce((acc, template) => {
    const goal = template.target_goal;
    const group = template.template_group || 'ungrouped';
    
    if (!acc[goal]) acc[goal] = {};
    if (!acc[goal][group]) acc[goal][group] = [];
    acc[goal][group].push(template);
    return acc;
  }, {}) || {};

  Object.keys(templatesByGoalAndGroup).forEach(goal => {
    if (templatesByGoalAndGroup[goal]) {
      Object.keys(templatesByGoalAndGroup[goal]).forEach(group => {
        if (templatesByGoalAndGroup[goal][group]) {
          templatesByGoalAndGroup[goal][group].sort((a, b) => (a.version_number || 1) - (b.version_number || 1));
        }
      });
    }
  });

  const exercisesByGoal = exercises?.filter(ex => ex.target_goal).reduce((acc, exercise) => {
    const goal = exercise.target_goal;
    if (!acc[goal]) acc[goal] = [];
    acc[goal].push(exercise);
    return acc;
  }, {}) || {};

  const legacyExercises = exercises?.filter(ex => !ex.target_goal) || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Workout Management</h1>
        <p className="text-slate-600">Manage exercises and workout templates with rotation support</p>
      </div>

      <Card className="border-none shadow-lg mb-8 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            Force Sync All Exercises to Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Use this to push all exercise updates (including coach videos) to every user's active schedule. 
            This ensures everyone has the latest video URLs and exercise data.
          </p>
          <Button
            onClick={handleFullSync}
            disabled={isSyncing}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Force Sync All'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg mb-8 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Global Rotation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rotate All Templates Every (weeks)</label>
              <div className="flex gap-3 items-center">
                <Input
                  type="number"
                  min="1"
                  value={rotationWeeks}
                  onChange={(e) => setRotationWeeks(parseInt(e.target.value) || 1)}
                  className="max-w-xs"
                />
                <Button
                  onClick={handleSaveRotationWeeks}
                  disabled={savingRotation}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingRotation ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                💡 All template groups will automatically rotate to their next version every {rotationWeeks} weeks
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Example: If you have Chest Day v1, v2, v3 - they'll cycle through automatically every {rotationWeeks} weeks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Exercise Library
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Workout Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exercises" className="mt-6">
          <div className="mb-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <p className="text-slate-600">{exercises?.length || 0} exercises in library</p>
              <div className="flex gap-2">
                <Button
                  onClick={exportExercises}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <label>
                  <input
                    id="exercise-import-input"
                    type="file"
                    accept="application/json,.json"
                    onChange={importExercises}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => document.getElementById('exercise-import-input').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </label>
                <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => resetExerciseForm()}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Exercise
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExercise ? 'Edit Exercise' : 'Create New Exercise'}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Exercise Name</label>
                      <Input
                        value={exerciseFormData.name}
                        onChange={(e) => setExerciseFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Barbell Squat"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Exercise Code (Unique ID)</label>
                      <Input
                        value={exerciseFormData.exercise_code}
                        onChange={(e) => setExerciseFormData(prev => ({ ...prev, exercise_code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                        placeholder="e.g., BARBELL_SQUAT"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Used to track weights across name changes. Auto-generated if left empty.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description / Instructions</label>
                      <Textarea
                        value={exerciseFormData.description}
                        onChange={(e) => setExerciseFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional instructions or form cues"
                        className="h-20"
                      />
                    </div>

                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-green-900 mb-3">
                        Fitness Goals <span className="text-red-500">* Required</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-green-200">
                          <Checkbox
                            id="goal-tone"
                            checked={exerciseFormData.target_goal.includes("tone_body")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                target_goal: checked
                                  ? [...prev.target_goal, "tone_body"]
                                  : prev.target_goal.filter(g => g !== "tone_body")
                              }));
                            }}
                          />
                          <label htmlFor="goal-tone" className="text-sm font-medium leading-none cursor-pointer">
                            Tone Body
                          </label>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-green-200">
                          <Checkbox
                            id="goal-muscle"
                            checked={exerciseFormData.target_goal.includes("build_muscle")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                target_goal: checked
                                  ? [...prev.target_goal, "build_muscle"]
                                  : prev.target_goal.filter(g => g !== "build_muscle")
                              }));
                            }}
                          />
                          <label htmlFor="goal-muscle" className="text-sm font-medium leading-none cursor-pointer">
                            Build Muscle
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-blue-900 mb-3">
                        Equipment <span className="text-red-500">* Required</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-blue-200">
                          <Checkbox
                            id="equip-gym"
                            checked={exerciseFormData.equipment_needed.includes("full_gym")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                equipment_needed: checked
                                  ? [...prev.equipment_needed, "full_gym"]
                                  : prev.equipment_needed.filter(e => e !== "full_gym")
                              }));
                            }}
                          />
                          <label htmlFor="equip-gym" className="text-sm font-medium leading-none cursor-pointer">
                            Full Gym
                          </label>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-blue-200">
                          <Checkbox
                            id="equip-body"
                            checked={exerciseFormData.equipment_needed.includes("bodyweight_only")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                equipment_needed: checked
                                  ? [...prev.equipment_needed, "bodyweight_only"]
                                  : prev.equipment_needed.filter(e => e !== "bodyweight_only")
                              }));
                            }}
                          />
                          <label htmlFor="equip-body" className="text-sm font-medium leading-none cursor-pointer">
                            At Home
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-indigo-900 mb-3">
                        Experience Level <span className="text-red-500">* Required</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-indigo-200">
                          <Checkbox
                            id="level-beginner"
                            checked={exerciseFormData.experience_level.includes("beginner")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                experience_level: checked
                                  ? [...prev.experience_level, "beginner"]
                                  : prev.experience_level.filter(l => l !== "beginner")
                              }));
                            }}
                          />
                          <label htmlFor="level-beginner" className="text-sm font-medium leading-none cursor-pointer">
                            Beginner
                          </label>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-indigo-200">
                          <Checkbox
                            id="level-intermediate"
                            checked={exerciseFormData.experience_level.includes("intermediate")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                experience_level: checked
                                  ? [...prev.experience_level, "intermediate"]
                                  : prev.experience_level.filter(l => l !== "intermediate")
                              }));
                            }}
                          />
                          <label htmlFor="level-intermediate" className="text-sm font-medium leading-none cursor-pointer">
                            Intermediate
                          </label>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2 rounded border border-indigo-200">
                          <Checkbox
                            id="level-advanced"
                            checked={exerciseFormData.experience_level.includes("advanced")}
                            onCheckedChange={(checked) => {
                              setExerciseFormData(prev => ({
                                ...prev,
                                experience_level: checked
                                  ? [...prev.experience_level, "advanced"]
                                  : prev.experience_level.filter(l => l !== "advanced")
                              }));
                            }}
                          />
                          <label htmlFor="level-advanced" className="text-sm font-medium leading-none cursor-pointer">
                            Advanced
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-orange-900 mb-3">
                        Target Zones <span className="text-red-500">* Required</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {targetZoneOptions.map(opt => (
                          <div key={opt.value} className="flex items-center space-x-2 bg-white p-2 rounded border border-orange-200">
                            <Checkbox
                              id={`ex-zone-${opt.value}`}
                              checked={exerciseFormData.target_zones.includes(opt.value)}
                              onCheckedChange={(checked) => {
                                setExerciseFormData(prev => ({
                                  ...prev,
                                  target_zones: checked
                                    ? [...prev.target_zones, opt.value]
                                    : prev.target_zones.filter(z => z !== opt.value)
                                }));
                              }}
                            />
                            <label
                              htmlFor={`ex-zone-${opt.value}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {opt.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-orange-700 mt-2">
                        Select all zones this exercise targets (e.g., Shoulders + Abs for Arnold Press)
                      </p>
                      </div>

                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-purple-900 mb-3">
                        Stats to Display on Video Overlay
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "calories", label: "Calories" },
                          { value: "weight", label: "Weight" },
                          { value: "volume", label: "Volume" },
                          { value: "time_under_tension", label: "Time Under Tension" },
                          { value: "distance", label: "Distance" },
                          { value: "total_reps", label: "Total Reps" }
                        ].map(stat => (
                          <div key={stat.value} className="flex items-center space-x-2 bg-white p-2 rounded border border-purple-200">
                            <Checkbox
                              id={`stat-${stat.value}`}
                              checked={exerciseFormData.stats_to_display.includes(stat.value)}
                              onCheckedChange={(checked) => {
                                setExerciseFormData(prev => ({
                                  ...prev,
                                  stats_to_display: checked
                                    ? [...prev.stats_to_display, stat.value]
                                    : prev.stats_to_display.filter(s => s !== stat.value)
                                }));
                              }}
                            />
                            <label
                              htmlFor={`stat-${stat.value}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {stat.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-purple-700 mt-2">
                        Select which stats to show on the video overlay template (e.g., Weight, Volume, TUT)
                      </p>
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Checkbox
                        id="is_unilateral"
                        checked={exerciseFormData.is_unilateral}
                        onCheckedChange={(checked) => setExerciseFormData(prev => ({ ...prev, is_unilateral: checked }))}
                      />
                      <label
                        htmlFor="is_unilateral"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Single Arm/Leg Exercise
                        <p className="text-xs text-blue-700 mt-1 font-normal">
                          Reps will be performed one side at a time with a 5-second break between sides
                        </p>
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Default Sets</label>
                        <Input
                          type="number"
                          value={exerciseFormData.default_sets}
                          onChange={(e) => setExerciseFormData(prev => ({ ...prev, default_sets: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Default Reps</label>
                        <Input
                          value={exerciseFormData.default_reps}
                          onChange={(e) => setExerciseFormData(prev => ({ ...prev, default_reps: e.target.value }))}
                          placeholder="e.g., 10-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rest (sec)</label>
                        <Input
                          type="number"
                          value={exerciseFormData.default_rest_seconds}
                          onChange={(e) => setExerciseFormData(prev => ({ ...prev, default_rest_seconds: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>

                    {/* NEW: Coach Videos Section */}
                    <div className="border-t pt-4">
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-indigo-600" />
                            <label className="block text-sm font-semibold text-indigo-900">Coach Videos</label>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddCoachVideo}
                            variant="outline"
                            className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Coach Video
                          </Button>
                        </div>

                        {exerciseFormData.coach_videos.length === 0 ? (
                          <p className="text-sm text-indigo-700">
                            💡 Add demonstration videos from different coaches. Users can select their preferred coach.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {exerciseFormData.coach_videos.map((coachVideo, index) => (
                              <div key={index} className="bg-white rounded-lg p-3 border border-indigo-200">
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Select Coach</label>
                                    <Select
                                      value={coachVideo.coach_id}
                                      onValueChange={(v) => handleUpdateCoachVideo(index, 'coach_id', v)}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Choose coach..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {coaches?.map(coach => (
                                          <SelectItem key={coach.id} value={coach.id}>
                                            {coach.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveCoachVideo(index)}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full"
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">Video (YouTube URL or Upload)</label>
                                  <div className="flex gap-2">
                                    <Input
                                      value={coachVideo.video_url}
                                      onChange={(e) => handleUpdateCoachVideo(index, 'video_url', e.target.value)}
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      className="h-9 flex-1"
                                    />
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={(e) => handleCoachVideoUpload(e, index)}
                                      className="hidden"
                                      id={`coach-video-upload-${index}`}
                                      disabled={isUploadingCoachVideo === index}
                                    />
                                    <label htmlFor={`coach-video-upload-${index}`}>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-9"
                                        disabled={isUploadingCoachVideo === index}
                                        asChild
                                      >
                                        <span>
                                          {isUploadingCoachVideo === index ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Upload className="w-4 h-4" />
                                          )}
                                        </span>
                                      </Button>
                                    </label>
                                  </div>
                                </div>
                                {coachVideo.video_url && getYouTubeVideoId(coachVideo.video_url) && (
                                  <div className="mt-2">
                                    <img
                                      src={`https://img.youtube.com/vi/${getYouTubeVideoId(coachVideo.video_url)}/hqdefault.jpg`}
                                      alt="Video thumbnail"
                                      className="w-full rounded-lg border border-slate-200"
                                    />
                                  </div>
                                )}
                                {coachVideo.video_url && coachVideo.video_url.includes('supabase') && (
                                  <div className="mt-2">
                                    <p className="text-xs text-green-700 mb-1">✅ Uploaded Video:</p>
                                    <video
                                      src={coachVideo.video_url}
                                      controls
                                      className="w-full rounded-lg max-h-32"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Legacy Video URL (optional fallback) */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Video className="w-5 h-5 text-purple-600" />
                        <label className="block text-sm font-semibold text-purple-900">Default Video (Optional)</label>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={exerciseFormData.video_url}
                          onChange={(e) => setExerciseFormData(prev => ({ ...prev, video_url: e.target.value }))}
                          placeholder="YouTube URL or upload a video..."
                          className="flex-1"
                        />
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleExerciseVideoUpload}
                          className="hidden"
                          id="exercise-video-upload"
                          disabled={isUploadingExerciseVideo}
                        />
                        <label htmlFor="exercise-video-upload">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isUploadingExerciseVideo}
                            asChild
                          >
                            <span>
                              {isUploadingExerciseVideo ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                      </div>
                      {exerciseFormData.video_url && getYouTubeVideoId(exerciseFormData.video_url) && (
                        <div className="mt-3">
                          <p className="text-xs text-purple-700 mb-2">Preview:</p>
                          <a
                            href={exerciseFormData.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative rounded-lg overflow-hidden group cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${getYouTubeVideoId(exerciseFormData.video_url)}/maxresdefault.jpg`}
                              alt="Video thumbnail"
                              className="w-full rounded-lg"
                              onError={(e) => {
                                e.target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(exerciseFormData.video_url)}/hqdefault.jpg`;
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all">
                              <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                              <p className="text-white text-sm font-semibold flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Click to watch on YouTube
                              </p>
                            </div>
                          </a>
                        </div>
                      )}
                      {exerciseFormData.video_url && exerciseFormData.video_url.includes('supabase') && (
                        <div className="mt-3">
                          <p className="text-xs text-green-700 mb-2">✅ Uploaded Video:</p>
                          <video
                            src={exerciseFormData.video_url}
                            controls
                            className="w-full rounded-lg max-h-48"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExerciseFormData(prev => ({ ...prev, video_url: '' }))}
                            className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove Video
                          </Button>
                        </div>
                      )}
                      {exerciseFormData.video_url && !getYouTubeVideoId(exerciseFormData.video_url) && !exerciseFormData.video_url.includes('supabase') && (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Invalid YouTube URL. Please use a valid YouTube video or Shorts link, or upload a video.
                        </p>
                      )}
                      <p className="text-xs text-purple-600 mt-2">
                        💡 Fallback video if coach-specific videos aren't set
                      </p>
                    </div>

                    <Button
                      onClick={handleSubmitExercise}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingExercise ? 'Update Exercise' : 'Create Exercise'}
                    </Button>
                  </div>
                </DialogContent>
                </Dialog>
                </div>
                </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                placeholder="Search exercises..."
                value={exerciseLibrarySearch}
                onChange={(e) => setExerciseLibrarySearch(e.target.value)}
                className="max-w-sm"
              />
              <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {targetZoneOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedGoalFilter} onValueChange={setSelectedGoalFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Goals</SelectItem>
                  <SelectItem value="tone_body">Tone Body</SelectItem>
                  <SelectItem value="build_muscle">Build Muscle</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedLevelFilter} onValueChange={setSelectedLevelFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {legacyExercises.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Legacy Exercises Found</h3>
              <p className="text-sm text-yellow-800 mb-3">
                {legacyExercises.length} exercise{legacyExercises.length !== 1 ? 's' : ''} need to be updated with a goal type. 
                Click edit on each exercise below to assign a goal.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {legacyExercises.map(exercise => (
                  <Card key={exercise.id} className="border-yellow-200 bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {exercise.name}
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          No Goal
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {exercise.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exercise.description}</p>
                      )}
                      {(exercise.video_url || (exercise.coach_videos && exercise.coach_videos.length > 0)) && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <Video className="w-3 h-3 mr-1" />
                            Has Video
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-2 mb-4">
                        <div className="flex gap-2 text-xs text-slate-600">
                          <span>{exercise.default_sets || 3} sets</span>
                          <span>×</span>
                          <span>{exercise.default_reps || '10-12'} reps</span>
                          <span>•</span>
                          <span>{exercise.default_rest_seconds || 60}s rest</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Array.isArray(exercise.equipment_needed) 
                            ? exercise.equipment_needed.map(e => e === 'bodyweight_only' ? 'At Home' : e.replace(/_/g, ' ')).join(', ')
                            : (exercise.equipment_needed === 'bodyweight_only' ? 'At Home' : (exercise.equipment_needed || 'full_gym').replace(/_/g, ' '))}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditExercise(exercise)}
                          className="flex-1 bg-yellow-50 border-yellow-300 text-yellow-900 hover:bg-yellow-100"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Update Goal
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Delete this exercise?')) {
                              deleteExerciseMutation.mutate(exercise.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            {(() => {
              const allExercises = exercises || [];
              
              // Filter by search term
              let searchFilteredExercises = exerciseLibrarySearch
                ? allExercises.filter(ex =>
                    ex.name.toLowerCase().includes(exerciseLibrarySearch.toLowerCase())
                  )
                : allExercises;

              // Filter by zone
              if (selectedZoneFilter !== "all") {
                searchFilteredExercises = searchFilteredExercises.filter(ex =>
                  ex.target_zones && ex.target_zones.includes(selectedZoneFilter)
                );
              }

              // Filter by goal
              if (selectedGoalFilter !== "all") {
                searchFilteredExercises = searchFilteredExercises.filter(ex =>
                  ex.target_goal === selectedGoalFilter
                );
              }

              // Filter by level
              if (selectedLevelFilter !== "all") {
                searchFilteredExercises = searchFilteredExercises.filter(ex =>
                  ex.fitness_level === selectedLevelFilter || ex.fitness_level === "all"
                );
              }

              if (searchFilteredExercises.length === 0) {
                return (
                  <Card className="p-12 text-center">
                    <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600 mb-4">No exercises match your filters</p>
                  </Card>
                );
              }

              // Group by target zones
              const groupedByZone = targetZoneOptions.reduce((acc, zone) => {
                acc[zone.value] = searchFilteredExercises.filter(ex =>
                  ex.target_zones && ex.target_zones.includes(zone.value)
                );
                return acc;
              }, {});

              const uncategorized = searchFilteredExercises.filter(ex =>
                !ex.target_zones || ex.target_zones.length === 0
              );

              return (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    Exercise Library
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      ({searchFilteredExercises.length} exercise{searchFilteredExercises.length !== 1 ? 's' : ''})
                    </span>
                  </h2>

                  <div className="space-y-6">
                    {Object.entries(groupedByZone).map(([zone, zoneExercises]) => {
                      if (zoneExercises.length === 0) return null;
                      const zoneLabel = targetZoneOptions.find(opt => opt.value === zone)?.label || zone;

                      return (
                        <div key={zone}>
                          <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              {zoneLabel}
                            </Badge>
                            <span className="text-sm text-slate-500">({zoneExercises.length})</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {zoneExercises.map(exercise => (
                              <Card key={exercise.id} className="border-none shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-lg">{exercise.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {exercise.description && (
                            <p className="text-sm text-slate-600 mb-3">{exercise.description}</p>
                          )}
                          {(exercise.video_url || (exercise.coach_videos && exercise.coach_videos.length > 0)) && (
                            <a
                              href={exercise.video_url || (exercise.coach_videos.length > 0 ? exercise.coach_videos[0].video_url : '#')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mb-3 text-sm text-purple-600 hover:text-purple-700"
                            >
                              <Video className="w-4 h-4" />
                              <span>View Demo Video</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <div className="space-y-2 mb-4">
                            <div className="flex gap-2 text-xs text-slate-600">
                              <span>{exercise.default_sets} sets</span>
                              <span>×</span>
                              <span>{exercise.default_reps} reps</span>
                              <span>•</span>
                              <span>{exercise.default_rest_seconds}s rest</span>
                              {exercise.is_unilateral && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Unilateral</Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {Array.isArray(exercise.equipment_needed) 
                                ? exercise.equipment_needed.map(e => e === 'bodyweight_only' ? 'At Home' : e.replace(/_/g, ' ')).join(', ')
                                : (exercise.equipment_needed === 'bodyweight_only' ? 'At Home' : (exercise.equipment_needed || '').replace(/_/g, ' '))}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditExercise(exercise)}
                              className="flex-1"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Delete this exercise?')) {
                                  deleteExerciseMutation.mutate(exercise.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        </div>
                      );
                    })}

                    {uncategorized.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                          <Badge variant="outline">Uncategorized</Badge>
                          <span className="text-sm text-slate-500">({uncategorized.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {uncategorized.map(exercise => (
                            <Card key={exercise.id} className="border-none shadow-lg">
                              <CardHeader>
                                <CardTitle className="text-lg">{exercise.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {exercise.description && (
                                  <p className="text-sm text-slate-600 mb-3">{exercise.description}</p>
                                )}
                                {(exercise.video_url || (exercise.coach_videos && exercise.coach_videos.length > 0)) && (
                                  <a
                                    href={exercise.video_url || (exercise.coach_videos.length > 0 ? exercise.coach_videos[0].video_url : '#')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 mb-3 text-sm text-purple-600 hover:text-purple-700"
                                  >
                                    <Video className="w-4 h-4" />
                                    <span>View Demo Video</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                <div className="space-y-2 mb-4">
                                  <div className="flex gap-2 text-xs text-slate-600">
                                    <span>{exercise.default_sets} sets</span>
                                    <span>×</span>
                                    <span>{exercise.default_reps} reps</span>
                                    <span>•</span>
                                    <span>{exercise.default_rest_seconds}s rest</span>
                                    {exercise.is_unilateral && (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">Unilateral</Badge>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {Array.isArray(exercise.equipment_needed) 
                                      ? exercise.equipment_needed.map(e => e === 'bodyweight_only' ? 'At Home' : e.replace(/_/g, ' ')).join(', ')
                                      : (exercise.equipment_needed === 'bodyweight_only' ? 'At Home' : (exercise.equipment_needed || '').replace(/_/g, ' '))}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditExercise(exercise)}
                                    className="flex-1"
                                  >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm('Delete this exercise?')) {
                                        deleteExerciseMutation.mutate(exercise.id);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {exercises?.length === 0 && (
            <Card className="p-12 text-center">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 mb-4">No exercises yet</p>
              <Button
                onClick={() => {
                  resetExerciseForm();
                  setExerciseDialogOpen(true);
                }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Exercise
              </Button>
            </Card>
          )}

          {exercises?.length > 0 && legacyExercises.length === exercises.length && (
            <div className="text-center py-8">
              <p className="text-slate-600">All exercises need goal assignments. Update them above to see them organized by goal.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="mb-8 flex justify-between items-center">
            <p className="text-slate-600">{templates?.length || 0} templates</p>
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => resetTemplateForm()}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-orange-900 mb-3">
                      Template Goal Group
                    </label>
                    <Select
                      value={templateFormData.target_goal}
                      onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, target_goal: v }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select goal group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tone_body">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" />
                            <span>Tone Body</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="build_muscle">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" />
                            <span>Build Muscle</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-orange-700 mt-2">
                      Templates will be grouped by this goal and shown to users with matching fitness goals
                    </p>
                  </div>

                  {/* New Target Zones Multi-Select */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-blue-900 mb-3">
                      Target Zones <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {targetZoneOptions.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2 bg-white p-2 rounded border border-blue-200">
                          <Checkbox
                            id={`zone-${opt.value}`}
                            checked={templateFormData.target_zones.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setTemplateFormData(prev => ({
                                ...prev,
                                target_zones: checked
                                  ? [...prev.target_zones, opt.value]
                                  : prev.target_zones.filter(z => z !== opt.value)
                              }));
                            }}
                          />
                          <label
                            htmlFor={`zone-${opt.value}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      Select all zones this workout targets (e.g., Shoulders + Abs)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Template Name</label>
                    <Input
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Upper Body Strength Day"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={templateFormData.description}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this workout"
                      className="h-20"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">Version Settings</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Template Group Name</label>
                        <Input
                          value={templateFormData.template_group}
                          onChange={(e) => setTemplateFormData(prev => ({ ...prev, template_group: e.target.value }))}
                          placeholder="e.g., chest-day, leg-day (leave empty for no rotation)"
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          Group similar workouts together for automatic rotation
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Version Number</label>
                        <Input
                          type="number"
                          min="1"
                          value={templateFormData.version_number}
                          onChange={(e) => setTemplateFormData(prev => ({ ...prev, version_number: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      
                      <p className="text-xs text-blue-700">
                        💡 Example: Create "Chest Day v1" and "Chest Day v2" with group name "chest-day" - they'll rotate automatically every {rotationWeeks} weeks
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Equipment Required</label>
                      <Select
                        value={templateFormData.equipment_needed}
                        onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, equipment_needed: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_gym">Full Gym Access</SelectItem>
                          <SelectItem value="bodyweight_only">At Home</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Fitness Level</label>
                      <Select
                        value={templateFormData.fitness_level}
                        onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, fitness_level: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                      <Input
                        type="number"
                        value={templateFormData.duration_minutes}
                        onChange={(e) => setTemplateFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Muscle Group (Optional)</label>
                    <Input
                      value={templateFormData.muscle_group}
                      onChange={(e) => setTemplateFormData(prev => ({ ...prev, muscle_group: e.target.value }))}
                      placeholder="e.g., Chest, Legs, Back"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Exercises ({templateFormData.exercises.length})</h3>
                      <Button
                        onClick={() => setShowExercisePicker(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add from Library
                      </Button>
                    </div>

                    {templateFormData.exercises.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                        <Dumbbell className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-sm text-slate-600 mb-2">No exercises added yet</p>
                        <p className="text-xs text-slate-500">Click "Add from Library" to select exercises</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {templateFormData.exercises.map((ex, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                              <p className="font-medium text-slate-900">{ex.name}</p>
                              <p className="text-sm text-slate-600">
                                {ex.sets} sets × {ex.reps} reps | {ex.rest_seconds}s rest
                                {ex.is_unilateral && <span className="ml-2 text-blue-600">(Unilateral)</span>}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveExerciseFromTemplate(index)}
                              className="hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmitTemplate}
                    disabled={!templateFormData.name || templateFormData.target_zones.length === 0 || templateFormData.exercises.length === 0}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {templates?.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-slate-600 mb-4">No workout templates yet</p>
              <Button
                onClick={() => {
                  resetTemplateForm();
                  setTemplateDialogOpen(true);
                }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Template
              </Button>
            </Card>
          ) : (
            <div className="space-y-8">
              {goalOrder.map(goal => {
                const goalGroups = templatesByGoalAndGroup[goal] || {};
                const groupNames = Object.keys(goalGroups);
                if (groupNames.length === 0) return null;

                return (
                  <div key={goal}>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      {goalLabels[goal]}
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        ({Object.values(goalGroups).flat().length} template{Object.values(goalGroups).flat().length !== 1 ? 's' : ''})
                      </span>
                    </h2>
                    
                    {groupNames.map(groupName => {
                      const groupTemplates = goalGroups[groupName];
                      const isVersionGroup = groupName !== 'ungrouped' && groupTemplates.length > 1;
                      
                      return (
                        <div key={groupName} className="mb-6">
                          {groupName !== 'ungrouped' && (
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="text-lg font-semibold text-slate-700 capitalize">
                                {groupName.replace(/-/g, ' ')}
                              </h3>
                              {isVersionGroup && (
                                <Badge className="bg-blue-100 text-blue-800">
                                  {groupTemplates.length} versions
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupTemplates.map(template => (
                              <Card key={template.id} className="border-none shadow-lg">
                                <CardHeader>
                                  <CardTitle className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base">{template.name}</span>
                                        {template.version_number > 1 && (
                                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                                            v{template.version_number}
                                          </Badge>
                                        )}
                                      </div>
                                      {!template.is_active && (
                                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">Inactive</Badge>
                                      )}
                                    </div>
                                  </CardTitle>
                                  {template.description && (
                                    <p className="text-sm text-slate-600 mt-2">{template.description}</p>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 mb-4">
                                    <div className="flex gap-2 flex-wrap">
                                      {template.target_zones && template.target_zones.length > 0 && (
                                        template.target_zones.map(zone => (
                                          <Badge key={zone} variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                            {targetZoneOptions.find(opt => opt.value === zone)?.label || zone}
                                          </Badge>
                                        ))
                                      )}
                                      <Badge variant="outline">{template.equipment_needed === 'bodyweight_only' ? 'At Home' : template.equipment_needed.replace(/_/g, ' ')}</Badge>
                                      {template.muscle_group && (
                                        <Badge variant="outline">{template.muscle_group}</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600">
                                      {template.duration_minutes} min | {template.exercises?.length || 0} exercises
                                    </p>
                                    {template.template_group && (
                                      <p className="text-xs text-blue-600">
                                        Group: {template.template_group}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditTemplate(template)}
                                      className="flex-1"
                                    >
                                      <Edit2 className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    {template.is_active ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeactivateClick(template)}
                                        disabled={deactivateTemplateMutation.isPending && deactivatingTemplate?.id === template.id}
                                        className="text-orange-500 hover:text-orange-600"
                                      >
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Deactivate
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="text-slate-400"
                                      >
                                        Inactive
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm('Delete this template?')) {
                                          deleteTemplateMutation.mutate(template.id);
                                        }
                                      }}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deactivateConfirmDialogOpen} onOpenChange={setDeactivateConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-700 mb-4">
              Are you sure you want to deactivate <span className="font-semibold">{deactivatingTemplate?.name}</span>?
              This template will no longer be assigned to users.
            </p>
            {deactivatingTemplate?.template_group && (
              <p className="text-xs text-blue-600 mb-4">
                <span className="font-semibold">Important:</span> If this template belongs to a group, ensure another template in the same group is active to maintain rotation functionality.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setDeactivateConfirmDialogOpen(false);
                setDeactivatingTemplate(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={confirmDeactivateTemplate}
                disabled={deactivateTemplateMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deactivateTemplateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExercisePicker} onOpenChange={(open) => {
        if (!open) {
          setSelectedExercises([]);
        }
        setShowExercisePicker(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl">Select Exercises from Library</span>
                    <p className="text-sm font-normal text-slate-600 mt-1">
                      Goal: <span className="font-semibold capitalize">{templateFormData.target_goal.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddExercisesToTemplate}
                      disabled={selectedExercises.length === 0}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Selected ({selectedExercises.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowExercisePicker(false);
                        resetExerciseForm();
                        setExerciseFormData(prev => ({
                          ...prev,
                          target_goal: templateFormData.target_goal,
                          equipment_needed: templateFormData.equipment_needed
                        }));
                        setExerciseDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Exercise
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Search exercises..."
                  value={exerciseSearchTerm}
                  onChange={(e) => setExerciseSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {(() => {
            const filteredExercises = getFilteredExercisesForTemplate();
            
            if (filteredExercises.length === 0) {
              return (
                <div className="text-center py-12">
                  <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold mb-2">No Exercises Found</h3>
                  <p className="text-slate-600 mb-4">
                    No exercises match your template settings. Please adjust template filters or create a new exercise.
                  </p>
                  <Button
                    onClick={() => {
                      setShowExercisePicker(false);
                      resetExerciseForm();
                      setExerciseFormData(prev => ({
                        ...prev,
                        target_goal: templateFormData.target_goal,
                        equipment_needed: templateFormData.equipment_needed
                      }));
                      setExerciseDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Exercise for This Template
                  </Button>
                </div>
              );
            }
            
            return (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900">
                    Showing {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} 
                    {' '}for {goalLabels[templateFormData.target_goal]} / {templateFormData.fitness_level} / {templateFormData.equipment_needed === 'bodyweight_only' ? 'At Home' : templateFormData.equipment_needed.replace(/_/g, ' ')}.
                  </p>
                </div>
                
                <ScrollArea className="max-h-[50vh] pr-4">
                  <div className="space-y-2">
                    {filteredExercises.map(exercise => {
                      const isSelected = selectedExercises.some(e => e.id === exercise.id);
                      const isAlreadyInTemplate = templateFormData.exercises.some(e => e.name === exercise.name);
                      
                      return (
                        <div
                          key={exercise.id}
                          className={`flex items-start gap-3 p-4 border-2 rounded-lg transition-all ${
                            isAlreadyInTemplate
                            ? 'border-green-200 bg-green-50 opacity-60 cursor-not-allowed'
                            : isSelected 
                              ? 'border-orange-500 bg-orange-50 cursor-pointer' 
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!isAlreadyInTemplate) {
                              setSelectedExercises(prev => 
                                prev.find(e => e.id === exercise.id)
                                  ? prev.filter(e => e.id !== exercise.id)
                                  : [...prev, exercise]
                              );
                            }
                          }}
                        >
                          <Checkbox
                            checked={isSelected || isAlreadyInTemplate}
                            disabled={isAlreadyInTemplate}
                            onCheckedChange={() => {}}
                            className={isAlreadyInTemplate ? 'border-green-500' : ''}
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-900">{exercise.name}</h4>
                                {(exercise.video_url || (exercise.coach_videos && exercise.coach_videos.length > 0)) && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                                    <Video className="w-3 h-3 mr-1" />
                                    Video
                                  </Badge>
                                )}
                              </div>
                              {exercise.is_unilateral && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-2">
                                  Unilateral
                                </Badge>
                              )}
                              {isAlreadyInTemplate && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 ml-2">
                                  Already Added
                                </Badge>
                              )}
                            </div>
                            {exercise.description && (
                              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{exercise.description}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              {exercise.default_sets} sets × {exercise.default_reps} reps • {exercise.default_rest_seconds}s rest
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedExercises([]);
                      setShowExercisePicker(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddExercisesToTemplate}
                    disabled={selectedExercises.length === 0}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    Add {selectedExercises.length} Exercise{selectedExercises.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}