/* =====================================================================
   Kỹ năng mẫu cho hồ sơ SV thử (account 9101) – trang SV-04 "Hồ sơ năng lực & CV"
   Chạy: Supabase -> SQL Editor -> dán -> Run. Chạy lại nhiều lần vẫn an toàn.
   Chỉ động vào: bảng skill (thêm tên chưa có) và student_skill của SV 9101.
   ===================================================================== */

INSERT INTO skill (name, category) VALUES
    ('PyTorch',                              'Lĩnh vực & Mô hình AI'),
    ('Computer Vision (YOLOv8, DeepStream)', 'Lĩnh vực & Mô hình AI'),
    ('TensorRT & ONNX',                      'Lĩnh vực & Mô hình AI'),
    ('Vietnamese NLP & RAG Architecture',    'Lĩnh vực & Mô hình AI'),
    ('ROS2 & Gazebo Robotics',               'Lĩnh vực & Mô hình AI'),
    ('Python (NumPy, SciPy, OpenCV)',        'Ngôn ngữ & Frameworks'),
    ('C / C++ (C++17, CUDA C)',              'Ngôn ngữ & Frameworks'),
    ('FastAPI Microservices',                'Ngôn ngữ & Frameworks'),
    ('ReactJS / TypeScript (UI)',            'Ngôn ngữ & Frameworks'),
    ('Milvus & PostgreSQL (Vector DB)',      'Ngôn ngữ & Frameworks'),
    ('NVIDIA Jetson AGX Orin & Nano',        'Hạ tầng & Công cụ'),
    ('Docker Containerization & CI/CD',      'Hạ tầng & Công cụ'),
    ('Linux Embedded (Ubuntu Server)',       'Hạ tầng & Công cụ'),
    ('Git & GitHub Actions',                 'Hạ tầng & Công cụ'),
    ('Edge AI Quantization & Pruning',       'Hạ tầng & Công cụ')
ON CONFLICT (name) DO NOTHING;

INSERT INTO student_skill (student_id, skill_id, skill_level)
SELECT 9101, s.skill_id, v.lvl
FROM (VALUES
    ('PyTorch', 5), ('Computer Vision (YOLOv8, DeepStream)', 5), ('TensorRT & ONNX', 4),
    ('Vietnamese NLP & RAG Architecture', 3), ('ROS2 & Gazebo Robotics', 2),
    ('Python (NumPy, SciPy, OpenCV)', 4), ('C / C++ (C++17, CUDA C)', 4), ('FastAPI Microservices', 4),
    ('ReactJS / TypeScript (UI)', 3), ('Milvus & PostgreSQL (Vector DB)', 3),
    ('NVIDIA Jetson AGX Orin & Nano', 5), ('Docker Containerization & CI/CD', 4),
    ('Linux Embedded (Ubuntu Server)', 4), ('Git & GitHub Actions', 4), ('Edge AI Quantization & Pruning', 5)
) AS v(name, lvl)
JOIN skill s ON s.name = v.name
ON CONFLICT (student_id, skill_id) DO NOTHING;

-- Kiểm tra: phải ra 15 dòng
SELECT s.category, s.name, ss.skill_level
FROM student_skill ss JOIN skill s ON s.skill_id = ss.skill_id
WHERE ss.student_id = 9101
ORDER BY s.category, ss.skill_level DESC, s.name;
